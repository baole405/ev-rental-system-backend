import mongoose from "mongoose";

const userDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    docType: {
      type: String,
      required: true,
      trim: true,
    },
    docNumber: {
      type: String,
      trim: true,
      default: null,
    },
    docImageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    verifyStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const UserDocument = mongoose.model("UserDocument", userDocumentSchema);

export default UserDocument;
