import Brand from "../models/brand.model.js";
import Vehicle from "../models/vehicle.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const { list, get, create, update, remove } = createCrudHandlers(Brand, {
  defaultSort: { name: 1 },
});

export const listBrands = list;
export const getBrand = get;
export const createBrand = create;
export const updateBrand = update;
export const deleteBrand = remove;

export const getBrandVehicleCount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id).lean();

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const totalVehicles = await Vehicle.countDocuments({ brand: id });

    const { _id: brandId, name, description, baseDailyRate, depositAmount, imageUrl } = brand;

    return res.json({
      data: {
        brand: {
          id: brandId.toString(),
          name,
          description,
          baseDailyRate,
          depositAmount,
          imageUrl,
        },
        totalVehicles,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandVehicleCount,
};
