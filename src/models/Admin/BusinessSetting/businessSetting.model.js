// models/businessSettings.model.js
import mongoose from "mongoose";

const BusinessSettingsSchema = new mongoose.Schema(
  {
    referralNewUserReward: { type: Number, default: 3 }, // ₹ for new user
    referralExistingUserReward: { type: Number, default: 3 }, // ₹ for referrer
    referralSystemEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const BusinessSetting = mongoose.model(
  "BusinessSettings",
  BusinessSettingsSchema
);
