import User from "../models/user.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(User);

export const listUsers = list;
export const getUser = get;
export const createUser = create;
export const updateUser = update;
export const deleteUser = remove;

export default {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
