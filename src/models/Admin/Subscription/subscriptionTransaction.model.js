import mongoose from "mongoose";

const SubscriptionTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Plan snapshot (at time of purchase)
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    planName: { type: String, required: true },
    planKey: { type: String, required: true }, // ex: free, month_1, month_3, year_1
    durationInDays: { type: Number, required: true },

    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true }, // plan final price

    // Money parts
    walletUsed: { type: Number, default: 0 }, // from in-app wallet
    payableAmount: { type: Number, required: true }, // final amount going to PG

    // PG integration
    provider: { type: String, default: "razorpay" },
    orderId: { type: String, required: true }, // Razorpay order id or WALLET_ONLY_*
    paymentId: { type: String, default: null }, // set on success
    signature: { type: String, default: null }, // optional

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    failureReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionTransaction = mongoose.model(
  "SubscriptionTransaction",
  SubscriptionTransactionSchema
);
