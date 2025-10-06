import Handover from "../models/handover.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Handover, {
  populate: [
    { path: "rental" },
    { path: "vehicle" },
    { path: "staff" },
  ],
});

export const listHandovers = list;
export const getHandover = get;
export const createHandover = create;
export const updateHandover = update;
export const deleteHandover = remove;

export default {
  listHandovers,
  getHandover,
  createHandover,
  updateHandover,
  deleteHandover,
};
