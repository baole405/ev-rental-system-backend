import { Router } from "express";
import {
  listHandovers,
  getHandover,
  createHandover,
  updateHandover,
  deleteHandover,
} from "../controllers/handover.controller.js";

const router = Router();

router.get("/", listHandovers);
router.get("/:id", getHandover);
router.post("/", createHandover);
router.put("/:id", updateHandover);
router.delete("/:id", deleteHandover);

export default router;
