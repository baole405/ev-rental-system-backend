// models/payment-intent.model.js
import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true, index: true },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["created", "captured", "refund_pending", "cancelled"],
      default: "created",
    },
  },
  { timestamps: true, versionKey: false },
);

export const PaymentIntent = mongoose.model("PaymentIntent", schema);
export default PaymentIntent;
