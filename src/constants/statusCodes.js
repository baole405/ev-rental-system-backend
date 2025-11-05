export const BOOKING_STATUS = Object.freeze({
  CREATED: "CREATED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WAITING_PAYMENT: "WAITING_PAYMENT",
  PAID: "PAID",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CANCELLED: "CANCELLED",
  SUCCESS: "SUCCESS",
});

export const RENTAL_STATUS = Object.freeze({
  CREATED: "CREATED",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  CHECKED_IN: "CHECKED_IN", // ✅ Thêm: Khách đã check-in, chờ ký hợp đồng
  IN_PROGRESS: "IN_PROGRESS",
  LATE: "LATE",
  RETURNED: "RETURNED",
  DAMAGED: "DAMAGED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const VEHICLE_STATUS = Object.freeze({
  AVAILABLE: "available",
  RESERVED: "reserved",
  RENTED: "rented",
  MAINTENANCE: "maintenance",
  DAMAGED: "damaged",
  UNAVAILABLE: "unavailable",
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
});

export const PAYMENT_METHOD = Object.freeze({
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
  CREDIT_CARD: "credit_card",
  E_WALLET: "e_wallet",
});

export const RESERVATION_HOLD_MINUTES = 30;

export default {
  BOOKING_STATUS,
  RENTAL_STATUS,
  VEHICLE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  RESERVATION_HOLD_MINUTES,
};
