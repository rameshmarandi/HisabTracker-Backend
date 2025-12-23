import moment from "moment";
import { PLAN_KEYS } from "../../constant.js";
import { AppConfig } from "../../models/Admin/AppConfig/appConfig.model.js";
import { SubscriptionPlan } from "../../models/Admin/Subscription/subscriptionPlan.model.js";
import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSlackAlert } from "../slackService.js";
import { sendEmailOTP } from "./emailOtp.service.js";
import { applyReferralRewards } from "./referral.service.js";
import { formatSubscriptionResponse } from "./subscriptionFormatter.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";

let cachedAppConfig = null;

const loadFallbackConfig = async () => {
  if (!cachedAppConfig) {
    cachedAppConfig = await AppConfig.findOne({ key: "default" }).lean();
    if (!cachedAppConfig) {
      sendSlackAlert({
        event: "APP_CONFIG_MISSING_FOR_SIGNUP",
        message: "No default AppConfig found!",
        severity: "CRITICAL",
      });
    }
  }
  return cachedAppConfig;
};

export const registerUserService = async ({
  username,
  email,
  password,
  deviceId,
  referralCode,
}) => {
  // 1️⃣ Check existing user
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "User already registered");

  // 2️⃣ Referral resolution
  let referrerUser = null;
  if (referralCode) {
    referrerUser = await User.findOne({ referralCode });
    if (!referrerUser) throw new ApiError(400, "Invalid referral code");
  }

  // 3️⃣ Create user (email NOT verified yet)
  let user = await User.create({
    username,
    email,
    password,
    referredBy: referrerUser?._id || null,
    devices: [{ deviceId }],
    emailVerified: false,
    emailVerifiedAt: null,
  });

  // 4️⃣ Apply referral rewards (unchanged)
  await applyReferralRewards({ newUser: user, referrerUser, referralCode });

  // 5️⃣ Trial or Free Subscription (UNCHANGED)
  let sub = null;
  const appConfig = await AppConfig.findOne({});

  const trialEnabled = appConfig?.trialConfig?.isTrialEnabled ?? false;
  const trialDays = appConfig?.trialConfig?.trialDurationDays ?? 0;

  if (trialEnabled) {
    const premiumPlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.QUARTERLY,
      isActive: true,
    }).populate("features.featureId");

    if (premiumPlan) {
      const features = {};
      premiumPlan.features.forEach((f) => {
        features[f.featureKey] = f.value;
      });

      sub = {
        planId: premiumPlan._id,
        planKey: premiumPlan.planKey,
        planName: premiumPlan.name,
        isPremium: true,
        features,
        maxDevicesAllowed: features["multipledevices"] || 1,
        startedAt: Date.now(),
        expiresAt: Date.now() + trialDays * 86400000,
        source: "trial",
      };
    }
  }

  if (!sub) {
    const freePlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.FREE,
      isActive: true,
    }).populate("features.featureId");

    if (freePlan) {
      const features = {};
      freePlan.features.forEach((f) => {
        features[f.featureKey] = f.value;
      });

      sub = {
        planId: freePlan._id,
        planKey: PLAN_KEYS.FREE,
        planName: freePlan.name,
        isPremium: false,
        features,
        maxDevicesAllowed: features["multipledevices"] || 1,
        startedAt: Date.now(),
        expiresAt: null,
        source: "signup",
      };
    } else {
      const config = await loadFallbackConfig();
      sub = {
        planId: null,
        planKey: "free-fallback",
        planName: PLAN_KEYS.FREE,
        isPremium: false,
        features: config?.freeUserLimits || {},
        maxDevicesAllowed: config?.freeUserLimits?.maxDevices ?? 1,
        startedAt: Date.now(),
        expiresAt: null,
        source: "signup",
      };
    }
  }

  user.currentSubscription = sub;
  await user.save();

  // 6️⃣ Tokens (UNCHANGED)
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  user.devices[0].refreshToken = refreshToken;
  await user.save();
  // 🔔 SLACK ALERT (NON-BLOCKING)
  sendSlackAlert({
    event: "USER_REGISTERED",
    severity: "INFO",
    message: "New user registered",
    metadata: {
      email: user.email,
      username: user.username,
      source: user.currentSubscription?.source,
      referral: referralCode || "none",
      trial: user.currentSubscription?.source === "trial",
    },
  });

  // 7️⃣ Send EMAIL VERIFICATION OTP (NEW)
  try {
    await sendEmailOTP({
      email: user.email,
      purpose: "EMAIL_VERIFY",
      userName: user.username,
    });
  } catch (err) {
    // Do NOT break signup if email fails
    sendSlackAlert({
      event: "EMAIL_VERIFICATION_OTP_FAILED",
      message: err.message,
      userId: user._id.toString(),
      severity: "HIGH",
    });
  }

  // 8️⃣ Final response (explicit verification flag)
  return {
    user,
    subscription: formatSubscriptionResponse(
      user.currentSubscription,
      user.wallet?.balance || 0
    ),
    wallet: {
      balance: user.wallet?.balance || 0,
      totalEarnedCash: user.wallet?.totalEarnedCash || 0,
    },
    accessToken,
    refreshToken,
    isEmailVerified: user.emailVerified,
    referrerUser,
  };
};
