import UserDocument from "../models/userDocument.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(UserDocument, {
  populate: ["user", "verifiedBy"],
});

export const listUserDocuments = list;
export const getUserDocument = get;
export const createUserDocument = create;
export const updateUserDocument = update;
export const deleteUserDocument = remove;

export default {
  listUserDocuments,
  getUserDocument,
  createUserDocument,
  updateUserDocument,
  deleteUserDocument,
};
