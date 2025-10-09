import { Router } from "express";
import {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
} from "../controllers/booking.controller.js";

const router = Router();

router.get("/", listBookings);
router.get("/:id", getBooking);
router.post("/", createBooking);
router.put("/:id", updateBooking);
router.delete("/:id", deleteBooking);

export default router;
