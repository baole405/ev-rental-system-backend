import Rental from "../models/rental.model.js";
import Booking from "../models/booking.model.js";
import Vehicle from "../models/vehicle.model.js";
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

const { list, get, update, remove } = createCrudHandlers(Rental, {
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

export const listRentals = list;
export const getRental = get;
export const updateRental = update;
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

    const rentalPayload = {
      ...req.body,
      booking: booking._id,
      renter: booking.renter?._id ?? booking.renter,
      vehicle: vehicle._id,
      pickupStation:
        req.body.pickupStation ??
        (booking.pickupStation?._id ?? booking.pickupStation),
    };

    const rental = await Rental.create(rentalPayload);
    const populated = await rental.populate(RENTAL_POPULATE);

    res.status(201).json({ data: populated });
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
