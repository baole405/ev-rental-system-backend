import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Brand from "../models/brand.model.js";
import Vehicle from "../models/vehicle.model.js";

const BOOKING_POPULATE = [
  { path: "renter" },
  { path: "brand" },
  { path: "pickupStation" },
  { path: "vehicle" },
];

const extractId = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
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

const validateVehicleBrandMatch = async (vehicleId, brand) => {
  if (!vehicleId) {
    return { vehicle: null };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    return {
      error: { status: 400, message: "Invalid vehicle specified" },
    };
  }

  const vehicleBrandId = extractId(vehicle.brand);
  const brandId = extractId(brand);

  if (brandId && vehicleBrandId !== brandId) {
    return {
      error: {
        status: 400,
        message: "Vehicle brand does not match booking brand",
      },
    };
  }

  return { vehicle };
};

const normalizePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.round(parsed);
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

const calculatePricing = ({ brand, rentalDays, surchargeAmount }) => {
  const dailyRate = Number(brand?.baseDailyRate ?? 0);
  const baseAmount = Math.round(dailyRate * rentalDays);
  const surcharge = normalizeCurrency(surchargeAmount, 0);
  const depositAmount = Math.round(Number(brand?.depositAmount ?? 0));
  const totalAmount = baseAmount + surcharge + depositAmount;

  return {
    baseAmount,
    depositAmount,
    surchargeAmount: surcharge,
    totalAmount,
  };
};

const buildAvailabilityMaps = async (bookings) => {
  if (!bookings.length) {
    return { availabilityMap: new Map(), fallbackMap: new Map() };
  }

  const brandIds = new Set();
  const stationCodes = new Set();

  bookings.forEach((booking) => {
    const brandId = extractId(booking.brand);
    if (brandId) {
      brandIds.add(brandId);
    }

    const pickupStationCode = booking.pickupStation?.code ?? null;
    if (pickupStationCode) {
      stationCodes.add(pickupStationCode);
    }
  });

  if (!brandIds.size) {
    return { availabilityMap: new Map(), fallbackMap: new Map() };
  }

  const brandObjectIds = [...brandIds].map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  let availabilityMap = new Map();
  if (stationCodes.size) {
    const availabilityStats = await Vehicle.aggregate([
      {
        $match: {
          brand: { $in: brandObjectIds },
          stationId: { $in: [...stationCodes] },
          status: "available",
        },
      },
      {
        $group: {
          _id: { brand: "$brand", stationId: "$stationId" },
          count: { $sum: 1 },
        },
      },
    ]);

    availabilityMap = new Map(
      availabilityStats.map((stat) => [
        `${stat._id.brand.toString()}:${stat._id.stationId}`,
        stat.count,
      ])
    );
  }

  const fallbackVehicles = await Vehicle.find({
    brand: { $in: brandObjectIds },
    status: "available",
  })
    .select("_id vin model stationId status brand")
    .populate("brand");

  const fallbackMap = fallbackVehicles.reduce((map, vehicle) => {
    const key = extractId(vehicle.brand) ?? "";
    if (!key) {
      return map;
    }
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push({
      _id: vehicle._id,
      vin: vehicle.vin,
      model: vehicle.model,
      stationId: vehicle.stationId,
      status: vehicle.status,
    });
    return map;
  }, new Map());

  return { availabilityMap, fallbackMap };
};

const hydrateBookings = async (bookings) => {
  if (!bookings.length) {
    return [];
  }

  const { availabilityMap, fallbackMap } = await buildAvailabilityMaps(bookings);

  return bookings.map((bookingDoc) => {
    const booking =
      typeof bookingDoc.toObject === "function"
        ? bookingDoc.toObject({ virtuals: true })
        : bookingDoc;

    const brandId = extractId(booking.brand);
    const stationCode = booking.pickupStation?.code ?? null;
    const availabilityKey =
      brandId && stationCode ? `${brandId}:${stationCode}` : null;
    const availableVehicleCount = availabilityKey
      ? availabilityMap.get(availabilityKey) ?? 0
      : 0;

    const availability = {
      stationCode,
      availableVehicleCount,
      isAvailable: availableVehicleCount > 0,
    };

    if (!availability.isAvailable && brandId) {
      const fallbackVehicles = fallbackMap.get(brandId) ?? [];
      if (fallbackVehicles.length > 0) {
        availability.fallbackVehicles = fallbackVehicles;
      }
    }

    return {
      ...booking,
      availability,
      pricing: {
        baseAmount: booking.baseAmount,
        depositAmount: booking.depositAmount,
        surchargeAmount: booking.surchargeAmount,
        totalAmount: booking.totalAmount,
      },
    };
  });
};

export const listBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.brandId) {
      filter.brand = req.query.brandId;
    }
    if (req.query.renterId) {
      filter.renter = req.query.renterId;
    }
    if (req.query.stationId) {
      filter.pickupStation = req.query.stationId;
    }

    const bookings = await Booking.find(filter)
      .populate(BOOKING_POPULATE)
      .sort({ createdAt: -1, _id: -1 });

    const hydrated = await hydrateBookings(bookings);
    res.json({ data: hydrated });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      BOOKING_POPULATE
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const [hydrated] = await hydrateBookings([booking]);
    res.json({ data: hydrated });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const rentalDays = normalizePositiveInteger(req.body.rentalDays, 1);
    const surchargeAmount = normalizeCurrency(req.body.surchargeAmount, 0);

    const brand = await Brand.findById(req.body.brand);
    if (!brand) {
      return res.status(400).json({ message: "Invalid brand specified" });
    }

    const { error: vehicleError } = await validateVehicleBrandMatch(
      req.body.vehicle,
      brand
    );

    if (vehicleError) {
      return res.status(vehicleError.status).json({ message: vehicleError.message });
    }

    const pricing = calculatePricing({
      brand,
      rentalDays,
      surchargeAmount,
    });

    const bookingPayload = {
      ...req.body,
      rentalDays,
      surchargeAmount: pricing.surchargeAmount,
      baseAmount: pricing.baseAmount,
      depositAmount: pricing.depositAmount,
      totalAmount: pricing.totalAmount,
    };

    const booking = await Booking.create(bookingPayload);
    const populated = await booking.populate(BOOKING_POPULATE);
    const [hydrated] = await hydrateBookings([populated]);
    res.status(201).json({ data: hydrated });
  } catch (error) {
    next(error);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const current = await Booking.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const rentalDays = normalizePositiveInteger(
      req.body.rentalDays ?? current.rentalDays,
      current.rentalDays
    );
    const surchargeAmount = normalizeCurrency(
      req.body.surchargeAmount ?? current.surchargeAmount,
      current.surchargeAmount
    );

    const brandId = req.body.brand ?? current.brand;
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(400).json({ message: "Invalid brand specified" });
    }

    const targetVehicleId =
      req.body.vehicle === undefined ? current.vehicle : req.body.vehicle;
    const { error: vehicleError } = await validateVehicleBrandMatch(
      targetVehicleId,
      brand
    );

    if (vehicleError) {
      return res.status(vehicleError.status).json({ message: vehicleError.message });
    }

    const pricing = calculatePricing({
      brand,
      rentalDays,
      surchargeAmount,
    });

    const updatePayload = {
      ...req.body,
      brand: brand._id,
      rentalDays,
      surchargeAmount: pricing.surchargeAmount,
      baseAmount: pricing.baseAmount,
      depositAmount: pricing.depositAmount,
      totalAmount: pricing.totalAmount,
    };

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate(BOOKING_POPULATE);

    const [hydrated] = await hydrateBookings([booking]);
    res.json({ data: hydrated });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
};
