import Payment from "../models/payment.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Payment, {
  populate: [{ path: "rental" }],
});

export const listPayments = list;
export const getPayment = get;
export const createPayment = create;
export const updatePayment = update;
export const deletePayment = remove;

export default {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
};
