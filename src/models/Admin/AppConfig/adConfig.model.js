// src/models/adConfig.model.js
import mongoose from "mongoose";

const adConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true, // e.g. "appStart", "afterTransactionSave"
    },
    enabled: { type: Boolean, default: true },
    type: {
      type: String,
      enum: ["banner", "interstitial", "rewarded", "native"],
      default: "interstitial",
    },
    frequency: { type: Number, default: 1 }, // show every Nth time

    adUnitIdAndroid: { type: String, default: "" },
    adUnitIdIOS: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AdConfig = mongoose.model("AdConfig", adConfigSchema);
