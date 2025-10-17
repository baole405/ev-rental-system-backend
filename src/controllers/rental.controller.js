import Rental from "../models/rental.model.js";
import Booking from "../models/booking.model.js";
import Vehicle from "../models/vehicle.model.js";
import Payment from "../models/payment.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const extractId = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    if (value._id) {
      const idValue = value._id;
      return typeof idValue === "string" ? idValue : idValue.toString();
    }
    if (typeof value.toString === "function") {
      const str = value.toString();
      return str === "[object Object]" ? null : str;
    }
  }
  return null;
};

const RENTAL_POPULATE = [
  { path: "booking", populate: [{ path: "brand" }, { path: "pickupStation" }] },
  { path: "renter" },
  { path: "vehicle", populate: [{ path: "brand" }] },
  { path: "pickupStation" },
  { path: "returnStation" },
];

const { list, get, remove } = createCrudHandlers(Rental, {
  populate: RENTAL_POPULATE,
});

const ensureVehicleForBooking = async (booking, requestedVehicleId) => {
  if (!booking) {
    return {
      error: { status: 400, message: "Booking is required to assign a vehicle" },
    };
  }

  const bookingBrandId = extractId(booking.brand);
  if (!bookingBrandId) {
    return {
      error: {
        status: 400,
        message: "Booking does not specify a brand",
      },
    };
  }

  if (requestedVehicleId) {
    const vehicle = await Vehicle.findById(requestedVehicleId);
    if (!vehicle) {
      return { error: { status: 404, message: "Vehicle not found" } };
    }

    if (vehicle.status !== "available") {
      return {
        error: { status: 409, message: "Vehicle is not available for rental" },
      };
    }

    const vehicleBrandId = extractId(vehicle.brand);
    if (vehicleBrandId !== bookingBrandId) {
      return {
        error: {
          status: 400,
          message: "Vehicle brand does not match booking requirement",
        },
      };
    }

    return { vehicle };
  }

  const stationCode = booking.pickupStation?.code ?? null;

  let vehicle = null;
  if (stationCode) {
    vehicle = await Vehicle.findOne({
      brand: bookingBrandId,
      stationId: stationCode,
      status: "available",
    }).sort({ createdAt: 1, _id: 1 });
  }

  if (!vehicle) {
    vehicle = await Vehicle.findOne({
      brand: bookingBrandId,
      status: "available",
    }).sort({ createdAt: 1, _id: 1 });
  }

  if (!vehicle) {
    return {
      error: {
        status: 409,
        message: "No available vehicle found for requested brand",
      },
    };
  }

  return { vehicle };
};

const normalizeCurrency = (value, fallback = 0) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.round(parsed);
};

const normalizeOptionalNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const computeBookingPricing = (booking) => {
  const rentalDays = Math.max(1, Number(booking.rentalDays ?? 1));
  let baseAmount = Number(booking.baseAmount ?? 0);
  let depositAmount = Number(booking.depositAmount ?? 0);
  let surchargeAmount = Number(booking.surchargeAmount ?? 0);

  if ((!baseAmount || !depositAmount) && booking.brand) {
    const dailyRate = Number(booking.brand.baseDailyRate ?? 0);
    const deposit = Number(booking.brand.depositAmount ?? 0);
    if (!baseAmount) {
      baseAmount = Math.round(dailyRate * rentalDays);
    }
    if (!depositAmount) {
      depositAmount = Math.round(deposit);
    }
  }

  const totalAmount = baseAmount + depositAmount + surchargeAmount;

  return { baseAmount, depositAmount, surchargeAmount, totalAmount };
};

const recalculateSettlement = (rental) => {
  const extraCharges = normalizeCurrency(rental.extraCharges ?? 0, 0);
  const lateFeeAmount = normalizeCurrency(rental.lateFeeAmount ?? 0, 0);
  const depositAmount = normalizeCurrency(rental.depositAmount ?? 0, 0);

  const totalDeductions = extraCharges + lateFeeAmount;
  const refundAmount = Math.max(0, depositAmount - totalDeductions);
  const amountDue = Math.max(0, totalDeductions - depositAmount);

  rental.extraCharges = extraCharges;
  rental.lateFeeAmount = lateFeeAmount;
  rental.refundAmount = refundAmount;
  rental.amountDue = amountDue;
};

export const listRentals = list;
export const getRental = get;
export const deleteRental = remove;

export const createRental = async (req, res, next) => {
  try {
    if (!req.body.booking) {
      return res.status(400).json({ message: "booking field is required" });
    }

    const booking = await Booking.findById(req.body.booking).populate([
      { path: "pickupStation" },
      { path: "renter" },
      { path: "brand" },
      { path: "vehicle" },
    ]);

    if (!booking) {
      return res.status(400).json({ message: "Invalid booking specified" });
    }

    if (booking.status !== "confirmed") {
      return res
        .status(409)
        .json({ message: "Booking must be confirmed before creating rental" });
    }

    const { vehicle, error } = await ensureVehicleForBooking(
      booking,
      req.body.vehicle
    );

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const pickupStationCode = booking.pickupStation?.code ?? null;

    vehicle.status = "rented";
    if (pickupStationCode) {
      vehicle.stationId = pickupStationCode;
    }
    await vehicle.save();

    if (!booking.vehicle || booking.vehicle.toString() !== vehicle._id.toString()) {
      booking.vehicle = vehicle._id;
      await booking.save();
    }

    const pricing = computeBookingPricing(booking);

    const paidPayments = await Payment.find({
      booking: booking._id,
      status: "paid",
    });

    const paidAmount = paidPayments.reduce(
      (sum, payment) => sum + Number(payment.totalAmount ?? 0),
      0
    );

    if (paidAmount < pricing.totalAmount) {
      return res
        .status(409)
        .json({ message: "Booking has not been fully paid yet" });
    }

    const rentalPayload = {
      ...req.body,
      booking: booking._id,
      renter: booking.renter?._id ?? booking.renter,
      vehicle: vehicle._id,
      pickupStation:
        req.body.pickupStation ??
        (booking.pickupStation?._id ?? booking.pickupStation),
      baseAmount: pricing.baseAmount,
      depositAmount: pricing.depositAmount,
      surchargeAmount: pricing.surchargeAmount,
      totalAmount: pricing.totalAmount,
      paidAmount,
      extraCharges: 0,
      extraChargeNotes: null,
      lateDays: 0,
      lateFeeAmount: 0,
      amountDue: 0,
      refundAmount: 0,
    };

    const rental = await Rental.create(rentalPayload);
    await Payment.updateMany(
      { booking: booking._id, status: "paid", rental: null },
      { rental: rental._id }
    );

    if (booking.status !== "confirmed") {
      booking.status = "confirmed";
      await booking.save();
    }

    const populated = await rental.populate(RENTAL_POPULATE);

    res.status(201).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

export const updateRental = async (req, res, next) => {
  try {
    let rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    const updatableFields = [
      "pickupTime",
      "returnTime",
      "pickupStation",
      "returnStation",
      "conditionNotes",
      "status",
      "extraChargeNotes",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        rental[field] = req.body[field];
      }
    });

    if (req.body.extraCharges !== undefined) {
      rental.extraCharges = normalizeCurrency(req.body.extraCharges, rental.extraCharges ?? 0);
    }

    if (req.body.lateFeeAmount !== undefined) {
      rental.lateFeeAmount = normalizeCurrency(req.body.lateFeeAmount, rental.lateFeeAmount ?? 0);
    }

    if (req.body.depositAmount !== undefined) {
      rental.depositAmount = normalizeCurrency(req.body.depositAmount, rental.depositAmount ?? 0);
    }

    if (req.body.odoStart !== undefined) {
      rental.odoStart = normalizeOptionalNumber(req.body.odoStart, rental.odoStart ?? null);
    }

    if (req.body.odoEnd !== undefined) {
      rental.odoEnd = normalizeOptionalNumber(req.body.odoEnd, rental.odoEnd ?? null);
    }

    if (req.body.lateDays !== undefined) {
      const parsedLateDays = normalizeOptionalNumber(req.body.lateDays, rental.lateDays ?? 0);
      rental.lateDays = Math.max(0, Math.round(parsedLateDays ?? 0));
    }

    const paidPayments = await Payment.find({
      booking: rental.booking,
      status: "paid",
    });

    rental.paidAmount = paidPayments.reduce(
      (sum, payment) => sum + Number(payment.totalAmount ?? 0),
      0
    );

    recalculateSettlement(rental);

    if (
      req.body.returnTime &&
      !req.body.status &&
      rental.status === "ongoing"
    ) {
      rental.status = "completed";
    }

    await rental.save();

    rental = await rental.populate(RENTAL_POPULATE);

    res.json({ data: rental });
  } catch (error) {
    next(error);
  }
};

export default {
  listRentals,
  getRental,
  createRental,
  updateRental,
  deleteRental,
};
