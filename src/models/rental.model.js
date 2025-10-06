import mongoose from "mongoose";

const rentalSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    pickupStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },
    returnStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
    },
    pickupTime: {
      type: Date,
      required: true,
    },
    returnTime: {
      type: Date,
      default: null,
    },
    odoStart: {
      type: Number,
      default: null,
      min: 0,
    },
    odoEnd: {
      type: Number,
      default: null,
      min: 0,
    },
    conditionNotes: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ongoing", "completed", "cancelled", "overdue"],
      default: "ongoing",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Rental = mongoose.model("Rental", rentalSchema);

export default Rental;
