import express from "express";
import {
  customerSignContract,
  getReadyForPickupRentals,
  staffConfirmCheckin,
} from "../controllers/checkin.controller.js";

const router = express.Router();

// Staff xác nhận khách check-in
router.post("/:rentalId/staff-confirm-checkin", staffConfirmCheckin);

// Khách ký hợp đồng điện tử
router.post("/:rentalId/customer-sign-contract", customerSignContract);

// Lấy danh sách rental đang chờ check-in
router.get("/ready-for-pickup", getReadyForPickupRentals);

export default router;
