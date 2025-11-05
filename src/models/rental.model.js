import mongoose from "mongoose";
import { RENTAL_STATUS } from "../constants/statusCodes.js";

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
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    plannedPickupTime: {
      type: Date,
      default: null,
    },
    plannedReturnTime: {
      type: Date,
      default: null,
    },
    returnStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
    },
    pickupTime: {
      type: Date,
      default: null,
    },
    returnTime: {
      type: Date,
      default: null,
    },
    actualStartTime: {
      type: Date,
      default: null,
    },
    actualEndTime: {
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
    note: {
      type: String,
      default: null,
      trim: true,
    },
    handoverPickup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Handover",
      default: null,
    },
    handoverReturn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Handover",
      default: null,
    },
    readyAt: {
      type: Date,
      default: null,
    },
    lateDetectedAt: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    // ✅ Thêm fields cho check-in và ký hợp đồng
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    checkinNotes: {
      type: String,
      default: null,
      trim: true,
    },
    actualPickupTime: {
      type: Date,
      default: null,
    },
    contractSignedAt: {
      type: Date,
      default: null,
    },
    contract: {
      type: {
        signedAt: Date,
        signature: String,
        agreedTerms: Boolean,
        ipAddress: String,
        userAgent: String,
      },
      default: null,
    },
    damagedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    // ✅ Thêm fields cho Return Vehicle
    returnInitiatedAt: {
      type: Date,
      default: null,
    },
    estimatedReturnTime: {
      type: Date,
      default: null,
    },
    currentMileage: {
      type: Number,
      default: null,
    },
    currentBatteryLevel: {
      type: Number,
      default: null,
    },
    returnNotes: {
      type: String,
      default: null,
      trim: true,
    },
    returnInspection: {
      type: {
        inspectedAt: Date,
        inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        batteryLevel: Number,
        mileage: Number,
        exteriorPhotos: [String],
        interiorPhotos: [String],
        damages: [
          {
            type: {
              type: String,
              enum: ["scratch", "dent", "broken", "missing", "stain"],
            },
            location: String,
            severity: {
              type: String,
              enum: ["minor", "moderate", "severe"],
            },
            estimatedCost: Number,
            photo: String,
          },
        ],
        notes: String,
        checklist: {
          cleanInterior: Boolean,
          cleanExterior: Boolean,
          tireCondition: {
            type: String,
            enum: ["good", "fair", "poor"],
          },
          lightsWorking: Boolean,
          brakesWorking: Boolean,
        },
      },
      default: null,
    },
    returnInspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    returnInspectedAt: {
      type: Date,
      default: null,
    },
    damageCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    cleaningFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    batteryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    extraChargePayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    refundPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    surchargeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    extraCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    extraChargeNotes: {
      type: String,
      default: null,
      trim: true,
    },
    lateDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(RENTAL_STATUS),
      default: RENTAL_STATUS.CREATED,
    },
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: Object.values(RENTAL_STATUS),
          },
          changedAt: {
            type: Date,
            default: Date.now,
          },
          changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          note: {
            type: String,
            trim: true,
            default: null,
          },
        },
      ],
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Rental = mongoose.model("Rental", rentalSchema);

export default Rental;
