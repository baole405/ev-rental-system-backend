import Station from "../models/station.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Station);

export const listStations = list;
export const getStation = get;
export const createStation = create;
export const updateStation = update;
export const deleteStation = remove;

export default {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
};
