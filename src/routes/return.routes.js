import express from "express";
import {
  customerInitiateReturn,
  finalizeReturn,
  getInProgressRentals,
  getReturningRentals,
  staffInspectReturn,
} from "../controllers/return.controller.js";

const router = express.Router();

// Khách bắt đầu quy trình trả xe
router.post("/:rentalId/customer-initiate-return", customerInitiateReturn);

// Staff kiểm tra xe khi trả
router.post("/:rentalId/staff-inspect-return", staffInspectReturn);

// Hoàn tất quy trình trả xe (thanh toán phí phát sinh)
router.post("/:rentalId/finalize-return", finalizeReturn);

// Lấy danh sách rental đang sử dụng (cho Customer)
router.get("/in-progress", getInProgressRentals);

// Lấy danh sách rental đang trả xe (cho Staff)
router.get("/returning", getReturningRentals);

export default router;
