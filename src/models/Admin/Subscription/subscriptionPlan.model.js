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
    description: { type: String },
    durationInDays: { type: Number, required: true },

    // Pricing
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    // Dynamic Feature Assignment
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
