import { Router } from "express";
import {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandVehicleCount,
} from "../controllers/brand.controller.js";

const router = Router();

router.get("/", listBrands);
router.get("/:id", getBrand);
router.get("/:id/vehicles/count", getBrandVehicleCount);
router.post("/", createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;
