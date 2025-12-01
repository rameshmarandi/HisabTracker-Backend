import mongoose from "mongoose";

const SubscriptionTransactionHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planKey: { type: String, required: true }, // month_1, year_1 etc

    basePrice: { type: Number, required: true },
    discountApplied: { type: Number, default: 0 }, // % discount used
    walletUsed: { type: Number, default: 0 },

    finalPaidAmount: { type: Number, required: true }, // Amount user paid

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "SUCCESS",
    },

    note: { type: String, default: "" }, // for admin / user display if needed
  },
  { timestamps: true }
);

export const SubscriptionTransactionHistory = mongoose.model(
  "SubscriptionTransactionHistory",
  SubscriptionTransactionHistorySchema
);
