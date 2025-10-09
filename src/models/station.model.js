import mongoose from "mongoose";

const stationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    openHours: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Station = mongoose.model("Station", stationSchema);

export default Station;
