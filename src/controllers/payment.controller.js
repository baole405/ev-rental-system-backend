import Payment from "../models/payment.model.js";
import Booking from "../models/booking.model.js";
import Rental from "../models/rental.model.js";
import User from "../models/user.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const PAYMENT_RELATIONS = [
  {
    path: "booking",
    populate: [
      { path: "brand" },
      { path: "renter" },
      { path: "pickupStation" },
    ],
  },
  {
    path: "rental",
    populate: [
      { path: "booking", populate: [{ path: "brand" }, { path: "pickupStation" }] },
      { path: "vehicle", populate: [{ path: "brand" }] },
      { path: "pickupStation" },
      { path: "returnStation" },
      { path: "renter" },
    ],
  },
  { path: "processedBy", select: "fullName email role" },
];

const { list, get, remove } = createCrudHandlers(Payment, {
  populate: PAYMENT_RELATIONS,
  defaultSort: { createdAt: -1, _id: -1 },
});

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

const resolveBooking = async (bookingId) =>
  Booking.findById(bookingId).populate([
    { path: "brand" },
    { path: "renter" },
    { path: "pickupStation" },
  ]);

const resolveRental = async (rentalId) =>
  Rental.findById(rentalId).populate([
    { path: "booking", populate: [{ path: "brand" }, { path: "pickupStation" }] },
    { path: "vehicle", populate: [{ path: "brand" }] },
    { path: "pickupStation" },
    { path: "returnStation" },
    { path: "renter" },
  ]);

const computeBookingPricing = (booking, overrideSurcharge) => {
  if (!booking) {
    return { error: { status: 400, message: "Invalid booking specified" } };
  }

  const rentalDays = Math.max(1, Number(booking.rentalDays ?? 1));

  let baseAmount = Number(booking.baseAmount ?? 0);
  let depositAmount = Number(booking.depositAmount ?? 0);

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

  const surchargeAmount = normalizeCurrency(
    overrideSurcharge ?? booking.surchargeAmount ?? 0,
    0
  );

  const totalAmount = baseAmount + depositAmount + surchargeAmount;

  return {
    baseAmount,
    depositAmount,
    surchargeAmount,
    totalAmount,
  };
};

export const listPayments = list;
export const getPayment = get;
export const deletePayment = remove;

export const createPayment = async (req, res, next) => {
  try {
    const { booking: bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "booking field is required" });
    }

    const booking = await resolveBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res
        .status(409)
        .json({ message: "Booking must be confirmed before payment" });
    }

    let rentalDoc = null;
    if (req.body.rental) {
      rentalDoc = await resolveRental(req.body.rental);
      if (!rentalDoc) {
        return res.status(404).json({ message: "Rental not found" });
      }

      const rentalBookingId = extractId(rentalDoc.booking);
      if (rentalBookingId && rentalBookingId !== booking._id.toString()) {
        return res
          .status(400)
          .json({ message: "Rental does not belong to the specified booking" });
      }
    }

    const existingPaidPayment = await Payment.findOne({
      booking: booking._id,
      status: "paid",
      rental: null,
    });

    if (existingPaidPayment && !rentalDoc) {
      return res
        .status(409)
        .json({ message: "Booking already has a completed payment" });
    }

    let processedById = null;
    if (req.body.processedBy) {
      const staff = await User.findById(req.body.processedBy);
      if (!staff) {
        return res.status(404).json({ message: "Processed staff not found" });
      }
      processedById = staff._id;
    }

    const pricing = computeBookingPricing(booking, req.body.surchargeAmount);

    if (pricing.error) {
      return res
        .status(pricing.error.status)
        .json({ message: pricing.error.message });
    }

    const paymentPayload = {
      method: req.body.method,
      status: req.body.status ?? "paid",
      txnRef: req.body.txnRef ?? null,
      booking: booking._id,
      rental: rentalDoc?._id ?? null,
      processedBy: processedById,
      baseAmount: pricing.baseAmount,
      depositAmount: pricing.depositAmount,
      surchargeAmount: pricing.surchargeAmount,
      totalAmount: pricing.totalAmount,
    };

    const payment = await Payment.create(paymentPayload);

    if (
      pricing.surchargeAmount !== booking.surchargeAmount ||
      pricing.totalAmount !== booking.totalAmount
    ) {
      booking.surchargeAmount = pricing.surchargeAmount;
      booking.totalAmount = pricing.totalAmount;
      await booking.save();
    }

    const populated = await payment.populate(PAYMENT_RELATIONS);

    res.status(201).json({
      data: {
        ...populated.toObject(),
        pricing: {
          baseAmount: pricing.baseAmount,
          depositAmount: pricing.depositAmount,
          surchargeAmount: pricing.surchargeAmount,
          totalAmount: pricing.totalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const bookingId = req.body.booking ?? payment.booking;
    const booking = await resolveBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const pricing = computeBookingPricing(booking, req.body.surchargeAmount);
    if (pricing.error) {
      return res
        .status(pricing.error.status)
        .json({ message: pricing.error.message });
    }

    let rentalId = payment.rental;
    if (req.body.rental !== undefined) {
      if (req.body.rental === null) {
        rentalId = null;
      } else {
        const rental = await resolveRental(req.body.rental);
        if (!rental) {
          return res.status(404).json({ message: "Rental not found" });
        }
        const rentalBookingId = extractId(rental.booking);
        if (rentalBookingId && rentalBookingId !== booking._id.toString()) {
          return res
            .status(400)
            .json({ message: "Rental does not belong to the specified booking" });
        }
        rentalId = rental._id;
      }
    }

    let processedById = payment.processedBy;
    if (req.body.processedBy !== undefined) {
      if (req.body.processedBy === null) {
        processedById = null;
      } else {
        const staff = await User.findById(req.body.processedBy);
        if (!staff) {
          return res.status(404).json({ message: "Processed staff not found" });
        }
        processedById = staff._id;
      }
    }

    const updatePayload = {
      booking: booking._id,
      rental: rentalId,
      method: req.body.method ?? payment.method,
      status: req.body.status ?? payment.status,
      txnRef: req.body.txnRef ?? payment.txnRef,
      processedBy: processedById,
      baseAmount: pricing.baseAmount,
      depositAmount: pricing.depositAmount,
      surchargeAmount: pricing.surchargeAmount,
      totalAmount: pricing.totalAmount,
    };

    const updated = await Payment.findByIdAndUpdate(
      payment._id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate(PAYMENT_RELATIONS);

    if (
      pricing.surchargeAmount !== booking.surchargeAmount ||
      pricing.totalAmount !== booking.totalAmount
    ) {
      booking.surchargeAmount = pricing.surchargeAmount;
      booking.totalAmount = pricing.totalAmount;
      await booking.save();
    }

    res.json({
      data: {
        ...updated.toObject(),
        pricing: {
          baseAmount: pricing.baseAmount,
          depositAmount: pricing.depositAmount,
          surchargeAmount: pricing.surchargeAmount,
          totalAmount: pricing.totalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
};
