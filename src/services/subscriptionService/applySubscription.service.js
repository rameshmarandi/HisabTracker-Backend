import { PLAN_KEYS } from "../../constant.js";

import { AppConfig } from "../../models/Admin/AppConfig/appConfig.model.js";
import { SubscriptionPlan } from "../../models/Admin/Subscription/subscriptionPlan.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSlackAlert } from "../slackService.js";

// Cached for performance
let cachedFreePlan = null;
let cachedAppConfig = null;

const loadFreePlan = async () => {
  if (!cachedFreePlan) {
    cachedFreePlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.FREE,
      isActive: true,
    }).populate("features.featureId");

    if (!cachedFreePlan) {
      sendSlackAlert(
        `🔥 FREE_PLAN_NOT_FOUND - Subscription broken!  
        Admin must configure default FREE plan.`
      );
    }
  }
  return cachedFreePlan;
};

const loadAppConfig = async () => {
  if (!cachedAppConfig) {
    cachedAppConfig = await AppConfig.findOne({ key: "default" }).lean();

    if (!cachedAppConfig) {
      sendSlackAlert(
        `🚨 APP_CONFIG_NOT_FOUND  
        Cannot fallback feature limits!`
      );
    }
  }
  return cachedAppConfig;
};

/**
 * Apply a premium/free plan to user
 */
export const applyPlanToUser = async ({
  user,
  plan,
  source = "payment",
  transaction = null,
}) => {
  if (!user) throw new ApiError(400, "User required");
  if (!plan) throw new ApiError(400, "Plan required");

  const planKey = plan.planKey;
  const now = Date.now();
  const millisPerDay = 24 * 60 * 60 * 1000;
  const addedDuration = (plan.durationInDays || 0) * millisPerDay;

  const currentSub = user.currentSubscription || {};
  const isFreePlan = planKey === PLAN_KEYS.FREE;
  const hasActivePremium =
    currentSub.isPremium && currentSub.expiresAt && currentSub.expiresAt > now;

  let newStartedAt = now;
  let newExpiresAt = null;

  // Premium Extension Logic
  if (!isFreePlan && hasActivePremium) {
    const baseTime = Math.max(currentSub.expiresAt, now);
    newExpiresAt = baseTime + addedDuration;
  } else if (!isFreePlan) {
    newExpiresAt = now + addedDuration;
  }

  // Create features map from plan
  const featuresMap = {};
  if (Array.isArray(plan.features)) {
    plan.features.forEach((f) => {
      featuresMap[f.featureKey] = f.value;
    });
  }

  // Fallback if some feature missing
  if (featuresMap.multipledevices == null) {
    const cfg = await loadAppConfig();
    featuresMap.multipledevices = cfg?.freeUserLimits?.maxDevices ?? 1;
  }

  const maxDevicesAllowed = featuresMap.multipledevices || 1;

  // Update user subscription
  user.currentSubscription = {
    planId: plan._id,
    planKey,
    planName: plan.name,
    isPremium: !isFreePlan,
    features: featuresMap,
    maxDevicesAllowed,
    startedAt: newStartedAt,
    expiresAt: newExpiresAt,
    source,
    transactionId: transaction?._id || null,
  };

  try {
    await user.save();
  } catch (err) {
    sendSlackAlert(
      `🚨 applyPlanToUser FAILED  
      User: ${user.email}  
      Plan: ${plan.name}  
      Error: ${err.message}`
    );
    throw err;
  }

  return user;
};

/**
 * Downgrade user when premium expires
 */
export const downgradeToFreePlan = async (user) => {
  const freePlan = await loadFreePlan();
  const config = await loadAppConfig();
  const now = Date.now();

  if (!freePlan && !config) {
    sendSlackAlert(
      `🔥 DOWNGRADE IMPOSSIBLE  
      Missing both FREE plan + AppConfig  
      User: ${user.email}`
    );
    throw new ApiError(500, "Fatal: No downgrade config");
  }

  const featuresMap = {};

  if (freePlan) {
    freePlan.features.forEach((f) => {
      featuresMap[f.featureKey] = f.value;
    });
  } else {
    // Config fallback
    Object.assign(featuresMap, {
      cloudsync: config?.premiumFeatureConfig?.cloudSync ?? false,
      multipledevices: config?.freeUserLimits?.maxDevices ?? 1,
      maxbooks: config?.freeUserLimits?.maxBooks ?? 1,
      maxcategoriesperbook: config?.freeUserLimits?.maxCategoriesPerBook ?? 50,
      exportlimit: config?.freeUserLimits?.maxTransactionsPerMonth ?? 2000,
      advancedpdf: config?.premiumFeatureConfig?.advancedPdf ?? false,
      premiumthemes: config?.premiumFeatureConfig?.premiumThemes ?? false,
      prioritysupport: false,
      chatbot: config?.uiFlags?.enableSmartAssistant ?? false,
    });
  }

  user.currentSubscription = {
    planId: freePlan?._id || null,
    planKey: PLAN_KEYS.FREE,
    planName: freePlan?.name || "Free",
    isPremium: false,
    features: featuresMap,
    maxDevicesAllowed: featuresMap.multipledevices || 1,
    startedAt: now,
    expiresAt: null,
    source: "system",
  };

  try {
    await user.save();
  } catch (err) {
    sendSlackAlert(
      `🚨 DOWNGRADE FAILED  
      User: ${user.email}  
      Error: ${err.message}`
    );
    throw err;
  }

  return user;
};
