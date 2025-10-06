import Vehicle from "../models/vehicle.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Vehicle, {
  populate: "station",
});

export const listVehicles = list;
export const getVehicle = get;
export const createVehicle = create;
export const updateVehicle = update;
export const deleteVehicle = remove;

export default {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
