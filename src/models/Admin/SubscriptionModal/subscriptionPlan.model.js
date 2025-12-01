// models/subscriptionPlan.model.js
import mongoose from "mongoose";

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    durationInDays: { type: Number, required: true },

    // Pricing
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    // BENEFITS → Array of strings
    benefits: {
      type: [String],
      default: [],
    },

    // Active status
    isActive: { type: Boolean, default: true },

    // Ordering index for UI sorting
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model(
  "SubscriptionPlan",
  SubscriptionPlanSchema
);
