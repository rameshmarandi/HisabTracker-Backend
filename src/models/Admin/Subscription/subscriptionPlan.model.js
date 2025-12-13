import mongoose from "mongoose";

const FeatureMappingSchema = new mongoose.Schema({
  featureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Feature",
    required: true,
  },
  featureKey: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },

    // 🔥 Very Important for logic: plan identity
    planKey: {
      type: String,
      required: true,
      enum: [
        "free", // Free Tier
        "monthly", // 30 Days
        "quarterly", // 90 Days
        "yearly", // 365 Days
        "lifetime", // Future Option
      ],
      index: true,
    },

    description: { type: String },

    // 30 / 90 / 365 etc. for premium plans
    durationInDays: { type: Number, required: true },

    // For deciding if expiry logic applies
    hasExpiry: { type: Boolean, default: true },

    // Pricing information
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    // Feature mapping (dynamic)
    features: {
      type: [FeatureMappingSchema],
      default: [],
    },

    benefits: {
      type: [String],
      default: [],
    },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model(
  "SubscriptionPlan",
  SubscriptionPlanSchema
);
