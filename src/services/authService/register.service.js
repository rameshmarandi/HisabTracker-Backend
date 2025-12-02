import { PLAN_KEYS } from "../../constant.js";
import { AppConfig } from "../../models/Admin/AppConfig/appConfig.model.js";
import { SubscriptionPlan } from "../../models/Admin/Subscription/subscriptionPlan.model.js";

import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSlackAlert } from "../slackService.js";
import { applyReferralRewards } from "./referral.service.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";

// -------------------- GLOBAL FALLBACK CACHE --------------------
let cachedAppConfig = null;
// const loadFallbackConfig = async () => {
//   if (!cachedAppConfig) {
//     cachedAppConfig = await AppConfig.findOne({ key: "default" }).lean();
//     console.log("⚙️ Cached AppConfig fallback loaded!");
//   }
//   return cachedAppConfig;
// };

const loadFallbackConfig = async () => {
  if (!cachedAppConfig) {
    cachedAppConfig = await AppConfig.findOne({ key: "default" }).lean();

    if (!cachedAppConfig) {
      sendSlackAlert({
        event: "APP_CONFIG_MISSING_FOR_SIGNUP",
        message: "AppConfig missing — cannot fallback for new users!",
        severity: "CRITICAL",
        metadata: {
          impact: "Subscriptions + Feature Mapping may break",
          action: "Admin must insert default AppConfig",
        },
      });
    } else {
      sendSlackAlert({
        event: "FREE_PLAN_MISSING_FALLBACK_USED",
        message: "Using AppConfig defaults because Free Plan not found",
        severity: "WARN",
        metadata: {
          fallbackSource: "AppConfig",
          featureCount: Object.keys(cachedAppConfig?.freeUserLimits || {})
            .length,
        },
      });
    }
  }

  return cachedAppConfig;
};

// -------------------- REGISTER USER SERVICE --------------------
export const registerUserService = async ({
  username,
  email,
  password,
  deviceId,
  referralCode,
}) => {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "User already registered");

  let referrerUser = null;
  if (referralCode) {
    referrerUser = await User.findOne({ referralCode });
    if (!referrerUser) throw new ApiError(400, "Invalid referral code");
  }

  let user = await User.create({
    username,
    email,
    password,
    referredBy: referrerUser?._id || null,
    devices: [{ deviceId }],
  });

  await applyReferralRewards({ newUser: user, referrerUser, referralCode });

  // Try fetching Free plan (Best path)
  const freePlan = await SubscriptionPlan.findOne({
    name: "Free",
    isActive: true,
  }).populate("features.featureId");

  let sub = {}; // new subscription block

  if (freePlan) {
    const features = {};
    freePlan.features.forEach((f) => {
      features[f.featureKey] = f.value;
    });

    const deviceFeature = freePlan.features.find(
      (f) => f.featureKey === "multipledevices"
    );

    sub = {
      planId: freePlan._id,
      planKey: PLAN_KEYS.FREE,
      planName: freePlan.name,
      isPremium: false,
      features,
      maxDevicesAllowed: deviceFeature?.value ?? 1,
      startedAt: Date.now(),
      expiresAt: null,
      source: "signup",
    };
  } else {
    // Fallback from AppConfig
    const config = await loadFallbackConfig();
    console.warn("⚠️ Free plan missing — using AppConfig fallback");

    sub = {
      planId: null,
      planKey: "free-fallback",
      planName: "Free",
      isPremium: false,
      features: {
        cloudsync: config?.premiumFeatureConfig?.cloudSync ?? false,
        multipledevices: config?.freeUserLimits?.maxDevices ?? 1,
        maxbooks: config?.freeUserLimits?.maxBooks ?? 1,
        maxcategoriesperbook:
          config?.freeUserLimits?.maxCategoriesPerBook ?? 50,
        exportlimit: config?.freeUserLimits?.maxTransactionsPerMonth ?? 2000,
        advancedpdf: config?.premiumFeatureConfig?.advancedPdf ?? false,
        premiumthemes: config?.premiumFeatureConfig?.premiumThemes ?? false,
        prioritysupport: false,
        chatbot: config?.uiFlags?.enableSmartAssistant ?? false,
      },
      maxDevicesAllowed: config?.freeUserLimits?.maxDevices ?? 1,
      startedAt: Date.now(),
      expiresAt: null,
      source: "signup",
    };
  }

  // Apply subscription block
  user.currentSubscription = sub;

  await user.save();

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  user.devices[0].refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken, referrerUser };
};
