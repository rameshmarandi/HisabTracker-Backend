import mongoose from "mongoose";

const trialConfigSchema = new mongoose.Schema(
  {
    isTrialEnabled: { type: Boolean, default: true },
    trialDurationDays: { type: Number, default: 365 },
  },
  { _id: false }
);

const freeUserLimitsSchema = new mongoose.Schema(
  {
    maxBooks: { type: Number, default: 1 },
    maxCategoriesPerBook: { type: Number, default: 50 },
    maxTransactionsPerMonth: { type: Number, default: 2000 },
    maxDevices: { type: Number, default: 1 },
  },
  { _id: false }
);

const extraFlagsSchema = new mongoose.Schema(
  {
    showBetaFeatures: { type: Boolean, default: false },
    enableSmartAssistantPremiumFeatures: { type: Boolean, default: false },
  },
  { _id: false }
);

const forceUpdateSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    minVersion: { type: String, default: "1.0.0" },
    latestVersion: { type: String, default: "1.0.0" },
    androidUrl: { type: String },
    iosUrl: { type: String },
    message: {
      type: String,
      default: "Please update the app to continue using.",
    },
  },
  { _id: false }
);

const maintenanceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    message: {
      type: String,
      default: "We are upgrading the system. Please try again later.",
    },
  },
  { _id: false }
);

const uiFlagsSchema = new mongoose.Schema(
  {
    enableSmartAssistant: { type: Boolean, default: true },
    enableInsightScreen: { type: Boolean, default: false },
    enableBudgetModule: { type: Boolean, default: false },
    enableSyncModule: { type: Boolean, default: true },
  },
  { _id: false }
);

// 🚀 Missing Schema Fixed Here
const premiumFeatureConfigSchema = new mongoose.Schema(
  {
    cloudSync: { type: Boolean, default: false },
    multiDevice: { type: Boolean, default: false },
    premiumThemes: { type: Boolean, default: false },
    advancedPdf: { type: Boolean, default: false },
  },
  { _id: false }
);

const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },

    isRevenueModelEnabled: { type: Boolean, default: false },
    isAdsGloballyEnabled: { type: Boolean, default: false },
    isSyncPremiumOnly: { type: Boolean, default: false },

    freeUserLimits: { type: freeUserLimitsSchema, default: () => ({}) },
    trialConfig: { type: trialConfigSchema, default: () => ({}) },
    extraFlags: { type: extraFlagsSchema, default: () => ({}) },

    forceUpdate: { type: forceUpdateSchema, default: () => ({}) },
    maintenance: { type: maintenanceSchema, default: () => ({}) },

    premiumFeatureConfig: {
      type: premiumFeatureConfigSchema,
      default: () => ({}),
    },

    uiFlags: { type: uiFlagsSchema, default: () => ({}) },

    updatedAt: { type: Date, default: Date.now },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

appConfigSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const AppConfig = mongoose.model("AppConfig", appConfigSchema);
