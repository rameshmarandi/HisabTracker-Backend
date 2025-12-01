import mongoose from "mongoose";

const WalletTransactionHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: { type: Number, required: true },

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    source: {
      type: String,
      enum: [
        "REFERRAL_NEW_USER",
        "REFERRAL_EXISTING_USER",
        "SUBSCRIPTION_PURCHASE",
        "ADMIN_ADJUSTMENT",
      ],
      required: true,
    },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const WalletTransactionHistory = mongoose.model(
  "WalletTransactionHistory",
  WalletTransactionHistorySchema
);
