// services/authService/registerAndVerify.service.js

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
/* 🔐 FALLBACK CONFIG CACHE                                            */
/* ------------------------------------------------------------------ */

let cachedAppConfig = null;

const getAppConfig = async () => {
  if (!cachedAppConfig) {
    cachedAppConfig = await AppConfig.findOne({ key: "default" }).lean();
  }
  return cachedAppConfig;
};

/* ------------------------------------------------------------------ */
/* 🟢 PHASE 1 — REGISTRATION (OTP ONLY, NO RESOURCE USE)               */
/* ------------------------------------------------------------------ */
// export const registerUserService = async ({
//   username,
//   email,
//   password,
//   referralCode,
// }) => {

//   let user = await User.findOne({ email });

//   // 1️⃣ Existing unverified user → resend OTP
//   if (user && !user.emailVerified) {
//     await sendEmailOTP({
//       email: user.email,
//       purpose: "EMAIL_VERIFY",
//       userName: user.username,
//       trigger: "RETRY_REGISTRATION",
//     });

//     return {
//       status: "OTP_SENT",
//       email: user.email,
//       userId: user._id,
//       isRetry: true,
//     };
//   }

//   // 2️⃣ Existing verified user → block
//   if (user && user.emailVerified) {
//     throw new ApiError(409, "Account already exists. Please login.");
//   }

//   // 3️⃣ Referral validation (STRICT)
//   let referrerUser = null;

//   console.log("REgetting_referral_before", referralCode);
//   if (referralCode) {
//     referrerUser = await User.findOne({ referralCode });
//     console.log("REgetting_referral_after", referralCode);
//     if (!referrerUser) {
//       // ❌ BREAK FLOW
//       throw new ApiError(
//         400,
//         "Invalid referral code. Please check or remove it to continue."
//       );
//     }
//   }

//   // 4️⃣ Create pending user (only if referral valid or not provided)
//   user = await User.create({
//     username,
//     email,
//     password,
//     referredBy: referrerUser?._id || null,
//     emailVerified: false,
//     emailVerifiedAt: null,
//     status: "pending",
//   });

//   // 5️⃣ Send OTP
//   await sendEmailOTP({
//     email: user.email,
//     purpose: "EMAIL_VERIFY",
//     userName: user.username,
//     trigger: "REGISTRATION",
//   });

//   sendSlackAlert({
//     event: "USER_PENDING_VERIFICATION",
//     severity: "INFO",
//     message: "User registered, awaiting email verification",
//     metadata: {
//       email: user.email,
//       referralProvided: Boolean(referralCode),
//     },
//   });

//   return {
//     status: "OTP_SENT",
//     email: user.email,
//     userId: user._id,
//     isRetry: false,
//   };
// };

export const registerUserService = async ({
  username,
  email,
  password,
  referralCode,
}) => {
  console.log("[REGISTER] Initiated", {
    email,
    referralProvided: Boolean(referralCode),
  });

  let user = await User.findOne({ email });

  // 1️⃣ Existing unverified user → resend OTP
  if (user && !user.emailVerified) {
    console.log("[REGISTER] Existing unverified user found", {
      email,
      userId: user._id.toString(),
    });

    await sendEmailOTP({
      email: user.email,
      purpose: "EMAIL_VERIFY",
      userName: user.username,
      trigger: "RETRY_REGISTRATION",
    });

    console.log("[REGISTER] OTP resent for unverified user", { email });

    return {
      status: "OTP_SENT",
      email: user.email,
      userId: user._id,
      isRetry: true,
    };
  }

  // 2️⃣ Existing verified user → block
  if (user && user.emailVerified) {
    console.warn("[REGISTER] Attempt to re-register verified user", {
      email,
      userId: user._id.toString(),
    });

    throw new ApiError(409, "Account already exists. Please login.");
  }

  // 3️⃣ Referral validation (STRICT)
  let referrerUser = null;

  if (referralCode) {
    console.log("[REGISTER] Referral code provided", {
      email,
      referralCode,
    });

    referrerUser = await User.findOne({ referralCode });

    if (!referrerUser) {
      console.warn("[REGISTER] Invalid referral code", {
        email,
        referralCode,
      });

      throw new ApiError(
        400,
        "Invalid referral code. Please check or remove it to continue."
      );
    }

    console.log("[REGISTER] Valid referral code", {
      email,
      referrerUserId: referrerUser._id.toString(),
    });
  }

  // 4️⃣ Create pending user
  console.log("[REGISTER] Creating pending user", { email });

  user = await User.create({
    username,
    email,
    password,
    referredBy: referrerUser?._id || null,
    emailVerified: false,
    emailVerifiedAt: null,
    status: "pending",
  });

  console.log("[REGISTER] Pending user created", {
    email,
    userId: user._id.toString(),
  });

  // 5️⃣ Send OTP
  await sendEmailOTP({
    email: user.email,
    purpose: "EMAIL_VERIFY",
    userName: user.username,
    trigger: "REGISTRATION",
  });

  console.log("[REGISTER] OTP sent for new registration", { email });

  sendSlackAlert({
    event: "USER_PENDING_VERIFICATION",
    severity: "INFO",
    message: "User registered, awaiting email verification",
    metadata: {
      email: user.email,
      referralProvided: Boolean(referralCode),
    },
  });

  return {
    status: "OTP_SENT",
    email: user.email,
    userId: user._id,
    isRetry: false,
  };
};

/* ------------------------------------------------------------------ */
/* 🔵 PHASE 2 — EMAIL OTP VERIFY + ACCOUNT ACTIVATION                  */
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

  // 1️⃣ Verify OTP
  await verifyEmailOTP({
    email,
    otp,
    purpose: "EMAIL_VERIFY",
  });

  // 2️⃣ Fetch user
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // 3️⃣ Eligibility guard
  if (user.status !== "pending") {
    throw new ApiError(403, "Account is not eligible for verification");
  }

  // 4️⃣ Activate user
  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.status = "active";

  /* -------------------------------------------------- */
  /* 🎁 APPLY REFERRAL (SAFE NOW)                        */
  /* -------------------------------------------------- */
  if (user.referredBy) {
    await applyReferralRewards({
      newUser: user,
      referrerUserId: user.referredBy,
      source: "signup",
    });
  }

  /* -------------------------------------------------- */
  /* 📦 ASSIGN SUBSCRIPTION (WITH FALLBACK)              */
  /* -------------------------------------------------- */
  let subscription = null;
  const appConfig = await getAppConfig();

  const trialEnabled = appConfig?.trialConfig?.isTrialEnabled ?? false;
  const trialDays = appConfig?.trialConfig?.trialDurationDays ?? 0;

  if (trialEnabled) {
    const trialPlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.QUARTERLY,
      isActive: true,
    }).populate("features.featureId");

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
        maxDevicesAllowed: features["multipledevices"] || 1,
        startedAt: Date.now(),
        expiresAt: Date.now() + trialDays * 86400000,
        source: "trial",
      };
    }
  }

  if (!subscription) {
    const freePlan = await SubscriptionPlan.findOne({
      planKey: PLAN_KEYS.FREE,
      isActive: true,
    }).populate("features.featureId");

    if (freePlan) {
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
        maxDevicesAllowed: features["multipledevices"] || 1,
        startedAt: Date.now(),
        expiresAt: null,
        source: "signup",
      };
    }
  }

  // 🔐 Fallback (LAST RESORT)
  if (!subscription) {
    sendSlackAlert({
      event: "APP_CONFIG_FALLBACK_USED",
      severity: "CRITICAL",
      message: "Fallback subscription applied during activation",
      metadata: { email },
    });

    subscription = {
      planId: null,
      planKey: "free-fallback",
      planName: PLAN_KEYS.FREE,
      isPremium: false,
      features: appConfig?.freeUserLimits || {},
      maxDevicesAllowed: appConfig?.freeUserLimits?.maxDevices ?? 1,
      startedAt: Date.now(),
      expiresAt: null,
      source: "fallback",
    };
  }

  user.currentSubscription = subscription;

  /* -------------------------------------------------- */
  /* 📱 DEVICE + TOKENS                                 */
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

  sendSlackAlert({
    event: "USER_ACTIVATED",
    severity: "INFO",
    message: "User account activated successfully",
    metadata: {
      email,
      source: subscription.source,
    },
  });

  /* -------------------------------------------------- */
  /* 🎯 FINAL RESPONSE                                  */
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
