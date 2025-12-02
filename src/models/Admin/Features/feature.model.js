import mongoose from "mongoose";

const FeatureSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },

    // Grouping category
    category: {
      type: String,
      default: "General",
      trim: true,
    },

    // boolean → toggle
    // number → range/limits
    // string → mode/select (future)
    valueType: {
      type: String,
      enum: ["boolean", "number", "string"],
      required: true,
    },

    // Default value applied to all users until plan overrides
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Feature = mongoose.model("Feature", FeatureSchema);
