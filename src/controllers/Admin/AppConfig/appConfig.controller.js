import { AdConfig } from "../../../models/Admin/AppConfig/adConfig.model.js";
import { AppConfig } from "../../../models/Admin/AppConfig/appConfig.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildAdsConfigObject } from "../../../utils/sanitizeAdConfig.js";

/**
 * Get current global app configuration
 */

const sanitizeAppConfig = (config) => ({
  isRevenueModelEnabled: config.isRevenueModelEnabled,
  isAdsGloballyEnabled: config.isAdsGloballyEnabled,
  isSyncPremiumOnly: config.isSyncPremiumOnly,

  freeUserLimits: config.freeUserLimits,
  trialConfig: config.trialConfig,
  extraFlags: config.extraFlags,

  forceUpdate: config.forceUpdate,
  maintenance: config.maintenance,
  uiFlags: config.uiFlags,
});

const getAppConfig = asyncHandler(async (req, res) => {
  const [appConfig, adConfigs] = await Promise.all([
    AppConfig.findOne({ key: "default" }).lean(),
    AdConfig.find({}).lean(),
  ]);

  if (!appConfig) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "AppConfig not initialized"));
  }

  // Prepare appConfig sanitized for public use
  //   const app = {
  //     isRevenueModelEnabled: appConfig.isRevenueModelEnabled,
  //     isAdsGloballyEnabled: appConfig.isAdsGloballyEnabled,
  //     isSyncPremiumOnly: appConfig.isSyncPremiumOnly,
  //     freeUserLimits: appConfig.freeUserLimits,
  //     trialConfig: appConfig.trialConfig,
  //     extraFlags: appConfig.extraFlags,
  //     forceUpdate: appConfig.forceUpdate,
  //     maintenance: appConfig.maintenance,
  //     uiFlags: appConfig.uiFlags,
  //   };

  // Build ads config
  const ads = buildAdsConfigObject(adConfigs, appConfig.isAdsGloballyEnabled);
  const app = sanitizeAppConfig(appConfig);

  const payload = { app, ads };

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Public config fetched successfully"));
});

/**
 * Create app configuration — Only once
 */
const createAppConfig = asyncHandler(async (req, res) => {
  const existing = await AppConfig.findOne({ key: "default" });

  if (existing) {
    throw new ApiError(
      400,
      "AppConfig already exists. Use PATCH to update instead."
    );
  }

  const config = await AppConfig.create({
    key: "default",
    ...req.body,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, config, "AppConfig created successfully"));
});

/**
 * Update existing config (partial update allowed)
 */
const updateAppConfig = asyncHandler(async (req, res) => {
  const config = await AppConfig.findOne({ key: "default" });

  if (!config) throw new ApiError(404, "AppConfig not found");

  Object.assign(config, req.body);
  await config.save();

  return res
    .status(200)
    .json(new ApiResponse(200, config, "AppConfig updated successfully"));
});

/**
 * Reset config to default initial values
 */
const resetAppConfig = asyncHandler(async (req, res) => {
  const config = await AppConfig.findOne({ key: "default" });

  if (!config) throw new ApiError(404, "AppConfig not found");

  await config.deleteOne();

  const newConfig = await AppConfig.create({
    key: "default",
    isRevenueModelEnabled: false,
    isAdsGloballyEnabled: false,
    isSyncPremiumOnly: false,

    freeUserLimits: {
      maxBooks: 2,
      maxCategoriesPerBook: 50,
      maxTransactionsPerMonth: 1000,
      maxDevices: 1, // 👈 free users allowed only 1 device
    },

    trialConfig: {
      isTrialEnabled: true,
      trialDurationDays: 365,
    },

    extraFlags: {},
  });

  return res
    .status(200)
    .json(new ApiResponse(200, newConfig, "AppConfig reset successfully"));
});

/**
 * Exporting all config controllers at bottom
 */
export { getAppConfig, createAppConfig, updateAppConfig, resetAppConfig };
