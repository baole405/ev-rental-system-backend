import { Router } from "express";
import {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
} from "../controllers/station.controller.js";

const router = Router();

router.get("/", listStations);
router.get("/:id", getStation);
router.post("/", createStation);
router.put("/:id", updateStation);
router.delete("/:id", deleteStation);

export default router;
