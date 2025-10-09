import Booking from "../models/booking.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Booking, {
  populate: [
    { path: "renter" },
    { path: "pickupStation" },
    { path: "vehicle" },
  ],
});

export const listBookings = list;
export const getBooking = get;
export const createBooking = create;
export const updateBooking = update;
export const deleteBooking = remove;

export default {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
};
