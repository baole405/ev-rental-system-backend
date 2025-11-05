import payos from "../config/payos.js";
import { BOOKING_STATUS } from "../constants/statusCodes.js";
import Booking from "../models/booking.model.js";
import PaymentIntent from "../models/paymentIntent.model.js";
import { confirmBookingOnPending } from "../utils/bookingConfirmation.js";

export const createCheckout = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    // Try to confirm the booking if it's pending
    try {
      await confirmBookingOnPending(bookingId);
    } catch (confirmError) {
      // Handle specific booking confirmation errors
      if (confirmError.message === "Booking not found") {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (confirmError.message === "Booking is not in a confirmable status") {
        return res.status(409).json({
          message: "Booking is not in a confirmable status",
          detail:
            "The booking may already be awaiting payment, cancelled, or completed",
        });
      }
      if (confirmError.message === "No vehicle assigned to booking") {
        return res.status(400).json({
          message: "No vehicle assigned to this booking",
          detail: "A vehicle must be assigned before payment can be processed",
        });
      }
      if (confirmError.message === "Vehicle not found") {
        return res.status(404).json({
          message: "The vehicle assigned to this booking was not found",
          detail: "Please contact support to resolve this issue",
        });
      }
      if (confirmError.message === "Vehicle is not available for booking") {
        return res.status(409).json({
          message: "The assigned vehicle is no longer available",
          detail: "The vehicle may have been rented or is under maintenance",
        });
      }
      // Re-throw unexpected errors
      throw confirmError;
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== BOOKING_STATUS.WAITING_PAYMENT) {
      return res.status(409).json({
        message: "Booking must be waiting for payment before checkout",
      });
    }

    const amount = Number(booking.totalPayable);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Invalid booking amount for payment" });
    }

    const orderCode = Number(`${Date.now()}`.slice(-9));

    const paymentLinkResponse = await payos.paymentRequests.create({
      amount,
      orderCode,
      description: `Payment #${orderCode}`,
      returnUrl: `${process.env.FRONTEND_URL}/payos/return?b=${booking._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/payos/cancel?b=${booking._id}`,
    });

    await PaymentIntent.create({
      orderCode: orderCode.toString(),
      bookingId: booking._id,
      amount,
    });

    return res.status(201).json({
      orderCode: String(orderCode),
      checkoutData: paymentLinkResponse,
    });
  } catch (error) {
    // Log the error for debugging
    console.error("PayOS checkout error:", error);

    // Handle PayOS API errors
    if (error.message?.includes("PayOS")) {
      return res.status(502).json({
        message: "Payment gateway error",
        detail: "Unable to create payment link. Please try again later.",
      });
    }

    // Pass other errors to global error handler
    next(error);
  }
};

/**
 * Verify payment status directly from PayOS
 * This endpoint should be called by frontend after PayOS redirect
 * to immediately verify payment and update booking status
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, orderCode } = req.body;

    console.log(
      `🔍 [PayOS Verify] Request for bookingId: ${bookingId}, orderCode: ${orderCode}`
    );

    // Validate input
    if (!bookingId || !orderCode) {
      return res.status(400).json({
        success: false,
        message: "bookingId and orderCode are required",
      });
    }

    // Find the payment intent
    const intent = await PaymentIntent.findOne({
      orderCode: String(orderCode),
      bookingId: bookingId,
    });

    if (!intent) {
      console.log(
        `❌ [PayOS Verify] No payment intent found for orderCode: ${orderCode}`
      );
      return res.status(404).json({
        success: false,
        message: "Payment intent not found",
      });
    }

    console.log(
      `📋 [PayOS Verify] Found intent for booking: ${intent.bookingId}`
    );

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.log(`❌ [PayOS Verify] Booking not found: ${bookingId}`);
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    console.log(`📄 [PayOS Verify] Current booking status: ${booking.status}`);

    // Query PayOS API to get payment status
    console.log(
      `🌐 [PayOS Verify] Querying PayOS API for orderCode: ${orderCode}`
    );
    let paymentInfo;
    try {
      // Correct method is 'get', not 'getPaymentLinkInformation'
      paymentInfo = await payos.paymentRequests.get(Number(orderCode));
      console.log(
        `✅ [PayOS Verify] PayOS response:`,
        JSON.stringify(paymentInfo, null, 2)
      );
    } catch (payosError) {
      console.error(`❌ [PayOS Verify] PayOS API error:`, payosError);
      return res.status(502).json({
        success: false,
        message: "Failed to verify payment with PayOS",
        detail: payosError.message,
      });
    }

    // Check if payment is successful
    const isPaid = paymentInfo.status === "PAID";
    console.log(
      `💳 [PayOS Verify] Payment status from PayOS: ${paymentInfo.status}, isPaid: ${isPaid}`
    );

    // If payment is successful but booking is still WAITING_PAYMENT, update it
    if (isPaid && booking.status === BOOKING_STATUS.WAITING_PAYMENT) {
      console.log(
        `🔄 [PayOS Verify] Payment successful, updating booking status...`
      );

      const mongoose = await import("mongoose");
      const session = await mongoose.default.startSession();

      try {
        await session.withTransaction(async () => {
          // Create payment record
          const { createPayment } = await import("./payment.controller.js");
          const { PAYMENT_STATUS } = await import(
            "../constants/statusCodes.js"
          );
          const fauxReq = {
            body: {
              booking: booking._id.toString(),
              method: "bank_transfer",
              status: PAYMENT_STATUS.SUCCESS, // Use correct enum value
              txnRef: orderCode,
              skipBookingUpdate: true,
            },
          };
          await new Promise((resolve, reject) => {
            const fauxRes = { status: () => fauxRes, json: () => resolve() };
            createPayment(fauxReq, fauxRes, reject);
          });
          console.log(`✅ [PayOS Verify] Payment record created`);

          // Update booking status
          const { updateBookingStatus } = await import(
            "./booking.controller.js"
          );
          const fauxReq2 = {
            params: { id: booking._id.toString() },
            body: { status: BOOKING_STATUS.PAID },
          };
          await new Promise((resolve, reject) => {
            const fauxRes2 = { json: () => resolve(), status: () => fauxRes2 };
            updateBookingStatus(fauxReq2, fauxRes2, reject);
          });
          console.log(`✅ [PayOS Verify] Booking status updated to PAID`);

          // Update payment intent status
          intent.status = "captured";
          await intent.save({ session });
        });
      } finally {
        session.endSession();
      }

      // Refresh booking data
      const updatedBooking = await Booking.findById(bookingId);
      console.log(`🎉 [PayOS Verify] Successfully updated booking to PAID`);

      // Return response with updated booking
      const response = {
        success: true,
        data: {
          verified: true,
          paymentStatus: paymentInfo.status,
          bookingStatus: updatedBooking.status,
          amount: paymentInfo.amount,
          transactionDate:
            paymentInfo.transactionDateTime || paymentInfo.createdAt,
          orderCode: orderCode,
        },
      };

      console.log(
        `✅ [PayOS Verify] Response:`,
        JSON.stringify(response, null, 2)
      );
      return res.status(200).json(response);
    }

    // Payment not yet successful or booking already updated
    const response = {
      success: true,
      data: {
        verified: true,
        paymentStatus: paymentInfo.status,
        bookingStatus: booking.status,
        amount: paymentInfo.amount,
        transactionDate:
          paymentInfo.transactionDateTime || paymentInfo.createdAt,
        orderCode: orderCode,
      },
    };

    console.log(
      `✅ [PayOS Verify] Response:`,
      JSON.stringify(response, null, 2)
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ [PayOS Verify] Error:", error);
    next(error);
  }
};
