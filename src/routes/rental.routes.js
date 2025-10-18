import { Router } from "express";
import {
  listRentals,
  getRental,
  createRental,
  updateRental,
  deleteRental,
} from "../controllers/rental.controller.js";

const router = Router();

router.get("/", listRentals);
router.get("/:id", getRental);
router.post("/", createRental);
router.put("/:id", updateRental);
router.delete("/:id", deleteRental);

export default router;
