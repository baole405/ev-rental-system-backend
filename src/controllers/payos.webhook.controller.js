import crypto from "crypto";
import mongoose from "mongoose";
import { BOOKING_STATUS, PAYMENT_STATUS } from "../constants/statusCodes.js";
import { updateBookingStatus as updateBookingStatusController } from "../controllers/booking.controller.js"; // we’ll reuse it
import { createPayment as createPaymentController } from "../controllers/payment.controller.js";
import Booking from "../models/booking.model.js";
import PaymentIntent from "../models/paymentIntent.model.js";

const verifySig = (data, signature) => {
  const key = process.env.PAYOS_CHECKSUM_KEY;
  const s = Object.keys(data)
    .sort()
    .map((k) => `${k}=${encodeURI(data[k] ?? "")}`)
    .join("&");
  const h = crypto.createHmac("sha256", key).update(s).digest("hex");
  return h === signature;
};

export const webhook = async (req, res) => {
  try {
    console.log(
      "🔔 [PayOS Webhook] Received:",
      JSON.stringify(req.body, null, 2)
    );

    const { data, signature } = req.body || {};
    if (!data || !signature) {
      console.log("❌ [PayOS Webhook] Missing data or signature");
      return res.sendStatus(401);
    }

    if (!verifySig(data, signature)) {
      console.log("❌ [PayOS Webhook] Invalid signature");
      return res.sendStatus(401);
    }

    console.log("✅ [PayOS Webhook] Signature verified");

    const orderCode = String(data.orderCode);
    const intent = await PaymentIntent.findOne({ orderCode });
    if (!intent) {
      console.log(
        `⚠️ [PayOS Webhook] No payment intent found for orderCode: ${orderCode}`
      );
      return res.sendStatus(200);
    }

    console.log(
      `📋 [PayOS Webhook] Found intent for booking: ${intent.bookingId}`
    );

    const existingPaid = await mongoose.connection
      .collection("payments")
      .findOne({ txnRef: orderCode, status: PAYMENT_STATUS.SUCCESS });
    if (existingPaid) {
      console.log(
        `ℹ️ [PayOS Webhook] Payment already processed for orderCode: ${orderCode}`
      );
      return res.sendStatus(200);
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findById(intent.bookingId).session(
          session
        );
        if (!booking) {
          console.log(
            `❌ [PayOS Webhook] Booking not found: ${intent.bookingId}`
          );
          throw new Error("Booking not found");
        }

        console.log(
          `📄 [PayOS Webhook] Current booking status: ${booking.status}`
        );

        if (booking.status !== BOOKING_STATUS.WAITING_PAYMENT) {
          console.log(
            `❌ [PayOS Webhook] Unexpected booking status: ${booking.status} (expected: WAITING_PAYMENT)`
          );
          throw new Error(`Unexpected booking status: ${booking.status}`);
        }

        console.log(`💳 [PayOS Webhook] Creating payment record...`);
        const fauxReq = {
          body: {
            booking: booking._id.toString(),
            method: "bank_transfer",
            status: PAYMENT_STATUS.SUCCESS,
            txnRef: orderCode,
            skipBookingUpdate: true,
          },
        };
        await new Promise((resolve, reject) => {
          const fauxRes = { status: () => fauxRes, json: () => resolve() };
          createPaymentController(fauxReq, fauxRes, reject);
        });
        console.log(`✅ [PayOS Webhook] Payment record created`);

        console.log(`📝 [PayOS Webhook] Updating booking status to PAID...`);
        const fauxReq2 = {
          params: { id: booking._id.toString() },
          body: { status: BOOKING_STATUS.PAID },
        };
        await new Promise((resolve, reject) => {
          const fauxRes2 = { json: () => resolve(), status: () => fauxRes2 };
          updateBookingStatusController(fauxReq2, fauxRes2, reject);
        });
        console.log(`✅ [PayOS Webhook] Booking status updated to PAID`);

        intent.status = "captured";
        await intent.save({ session });
      });
    } finally {
      session.endSession();
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("PayOS webhook error", e);
    return res.sendStatus(200);
  }
};
