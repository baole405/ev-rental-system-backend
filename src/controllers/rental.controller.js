import Rental from "../models/rental.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Rental, {
  populate: [
    { path: "booking" },
    { path: "renter" },
    { path: "vehicle" },
    { path: "pickupStation" },
    { path: "returnStation" },
  ],
});

export const listRentals = list;
export const getRental = get;
export const createRental = create;
export const updateRental = update;
export const deleteRental = remove;

export default {
  listRentals,
  getRental,
  createRental,
  updateRental,
  deleteRental,
};
