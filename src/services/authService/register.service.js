import { PLAN_KEYS } from "../../constant.js";
import { AppConfig } from "../../models/Admin/AppConfig/appConfig.model.js";
import { SubscriptionPlan } from "../../models/Admin/Subscription/subscriptionPlan.model.js";
import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";

import { sendSlackAlert } from "../slackService.js";
import { sendEmailOTP, verifyEmailOTP } from "./emailOtp.service.js";
import { applyReferralRewards } from "./referral.service.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";
import { formatSubscriptionResponse } from "./subscriptionFormatter.js";

/* ------------------------------------------------------------------ */
/* 🔐 APP CONFIG CACHE                                                 */
/* ------------------------------------------------------------------ */

let cachedAppConfig = null;

const getAppConfig = async () => {
  if (!cachedAppConfig) {
    cachedAppConfig = await AppConfig.findOne({ key: "default" }).lean();
  }
  return cachedAppConfig;
};

/* ------------------------------------------------------------------ */
/* 🟢 REGISTER USER (OTP ONLY, FAST)                                   */
/* ------------------------------------------------------------------ */

export const registerUserService = async ({
  username,
  email,
  password,
  referralCode,
}) => {
  let user = await User.findOne({ email });

  // Existing unverified user
  if (user && !user.emailVerified) {
    sendEmailOTP({
      email: user.email,
      purpose: "EMAIL_VERIFY",
      userName: user.username,
      trigger: "RETRY_REGISTRATION",
    }).catch(() => {});

    return {
      status: "OTP_SENT",
      email: user.email,
      userId: user._id,
      isRetry: true,
    };
  }

  // Existing verified user
  if (user && user.emailVerified) {
    throw new ApiError(409, "Account already exists. Please login.");
  }

  // Referral validation
  let referrerUser = null;
  if (referralCode) {
    referrerUser = await User.findOne({ referralCode });
    if (!referrerUser) {
      throw new ApiError(
        400,
        "Invalid referral code. Please check or remove it."
      );
    }
  }

  // Create pending user
  user = await User.create({
    username,
    email,
    password,
    referredBy: referrerUser?._id || null,
    referralCodeUsed: referralCode || null,
    emailVerified: false,
    status: "pending",
  });

  // Send OTP async (do not block frontend)
  sendEmailOTP({
    email: user.email,
    purpose: "EMAIL_VERIFY",
    userName: user.username,
    trigger: "REGISTRATION",
  }).catch(() => {});

  sendSlackAlert({
    event: "USER_PENDING_VERIFICATION",
    severity: "INFO",
    message: "User registered, awaiting verification",
    metadata: { email, referralProvided: Boolean(referralCode) },
  }).catch(() => {});

  return {
    status: "OTP_SENT",
    email: user.email,
    userId: user._id,
    isRetry: false,
  };
};

/* ------------------------------------------------------------------ */
/* 🔵 VERIFY OTP + ACTIVATE USER                                       */
/* ------------------------------------------------------------------ */

export const verifyEmailOtpService = async ({
  email,
  otp,
  deviceId,
  deviceName = "Unknown Device",
}) => {
  if (!email || !otp || !deviceId) {
    throw new ApiError(400, "Email, OTP and deviceId are required");
  }

  // Verify OTP (critical)
  await verifyEmailOTP({
    email,
    otp,
    purpose: "EMAIL_VERIFY",
  });

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  if (user.status !== "pending") {
    throw new ApiError(403, "Account is not eligible for verification");
  }

  // Activate account
  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.status = "active";

  /* -------------------------------------------------- */
  /* 📦 SUBSCRIPTION ASSIGNMENT                         */
  /* -------------------------------------------------- */

  let subscription = null;
  const appConfig = await getAppConfig();

  const trialEnabled = appConfig?.trialConfig?.isTrialEnabled === true;
  const trialDays = Number(appConfig?.trialConfig?.trialDurationDays || 0);

  if (trialEnabled && trialDays > 0) {
    const trialPlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.QUARTERLY,
      isActive: true,
    }).lean();

    if (trialPlan) {
      const features = {};
      trialPlan.features.forEach((f) => {
        features[f.featureKey] = f.value;
      });

      subscription = {
        planId: trialPlan._id,
        planKey: trialPlan.planKey,
        planName: trialPlan.name,
        isPremium: true,
        features,
        maxDevicesAllowed: features.multipledevices || 1,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + trialDays * 86400000),
        source: "trial",
      };
    }
  }

  if (!subscription) {
    const freePlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.FREE,
      isActive: true,
    }).lean();

    if (!freePlan) {
      throw new ApiError(500, "Free plan not configured");
    }

    const features = {};
    freePlan.features.forEach((f) => {
      features[f.featureKey] = f.value;
    });

    subscription = {
      planId: freePlan._id,
      planKey: PLAN_KEYS.FREE,
      planName: freePlan.name,
      isPremium: false,
      features,
      maxDevicesAllowed: features.multipledevices || 1,
      startedAt: new Date(),
      expiresAt: null,
      source: "signup",
    };
  }

  user.currentSubscription = subscription;

  /* -------------------------------------------------- */
  /* 🔐 TOKENS + DEVICE                                 */
  /* -------------------------------------------------- */

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const existingDevice = user.devices.find((d) => d.deviceId === deviceId);

  if (existingDevice) {
    existingDevice.lastActive = Date.now();
    existingDevice.refreshToken = refreshToken;
  } else {
    if (user.devices.length >= subscription.maxDevicesAllowed) {
      throw new ApiError(403, "Device limit exceeded");
    }

    user.devices.push({
      deviceId,
      deviceName,
      lastActive: Date.now(),
      refreshToken,
    });
  }

  await user.save();

  /* -------------------------------------------------- */
  /* 🎁 REFERRAL REWARD (ASYNC, NON-BLOCKING)           */
  /* -------------------------------------------------- */

  if (user.referredBy) {
    (async () => {
      try {
        const referrerUser = await User.findById(user.referredBy);
        if (!referrerUser) return;

        await applyReferralRewards({
          newUser: user,
          referrerUser,
          referralCode: user.referralCodeUsed,
        });
      } catch (err) {
        sendSlackAlert({
          event: "REFERRAL_REWARD_FAILED",
          severity: "ERROR",
          message: err.message,
          metadata: { email },
        }).catch(() => {});
      }
    })();
  }

  sendSlackAlert({
    event: "USER_ACTIVATED",
    severity: "INFO",
    message: "User activated successfully",
    metadata: { email, source: subscription.source },
  }).catch(() => {});

  /* -------------------------------------------------- */
  /* 🎯 RESPONSE                                        */
  /* -------------------------------------------------- */

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
    isEmailVerified: true,
  };
};
