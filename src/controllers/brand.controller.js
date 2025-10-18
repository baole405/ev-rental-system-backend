import Brand from "../models/brand.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Brand, {
  defaultSort: { name: 1 },
});

export const listBrands = list;
export const getBrand = get;
export const createBrand = create;
export const updateBrand = update;
export const deleteBrand = remove;

export default {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
};
