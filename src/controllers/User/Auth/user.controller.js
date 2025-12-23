import { User } from "../../../models/User/Auth/user.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { registerUserService } from "../../../services/authService/register.service.js";
import { loginUserService } from "../../../services/authService/login.service.js";
import { refreshPremiumStatus } from "../../../services/subscriptionService/refreshPremiumStatus.service.js";
import jwt from "jsonwebtoken";
import { decryptToken, encryptToken } from "../../../utils/TokenCrypto.js";
import { formatSubscriptionResponse } from "../../../services/authService/subscriptionFormatter.js";
import { mapUserResponse } from "../../../services/authService/responseMapper.js";
import {
  sendEmailOTP,
  verifyEmailOTP,
} from "../../../services/authService/emailOtp.service.js";
import crypto from "crypto";
// -------------------------------------------------------------
// HELPER — Refresh Premium if Expired
// -------------------------------------------------------------

export const sanitizeUser = (user) => {
  if (!user) return null;

  const u = typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete u.password;
  delete u.refreshToken;
  delete u.__v;
  delete u.syncToken;
  delete u.currentSubscription; // always separate return

  if (u.devices) {
    u.devices = u.devices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      lastActive: d.lastActive,
      lastSyncedAt: d.lastSyncedAt,
    }));
  }

  if (u.wallet) {
    delete u.wallet._id;
    delete u.wallet.totalUsedCash;
  }

  return u;
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, deviceId, referralCode } = req.body;

  if (!username || !email || !password || !deviceId) {
    throw new ApiError(400, "Username, email, password & deviceId required");
  }

  const result = await registerUserService({
    username,
    email,
    password,
    deviceId,
    referralCode,
  });

  const sanitizedUser = sanitizeUser(result.user);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: sanitizedUser,
        subscription: result.subscription,
        wallet: result.wallet,
        accessToken: result.accessToken, // FIXED
        refreshToken: result.refreshToken, // FIXED
      },
      result.referrerUser
        ? "Registered successfully. Referral applied & wallet credited."
        : "Registered successfully"
    )
  );
});

// forgot password controller

const forgotPasswordController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "If the email exists, OTP has been sent")
      );
  }

  const user = await User.findOne({ email });

  if (user) {
    await sendEmailOTP({
      email: user.email,
      purpose: "FORGOT_PASSWORD",
      userName: user.username,
    });
  }

  // Do NOT reveal whether user exists
  return res
    .status(200)
    .json(new ApiResponse(200, null, "If the email exists, OTP has been sent"));
});

const verifyForgotPasswordOtpController = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  // 1️⃣ Verify OTP
  await verifyEmailOTP({
    email,
    otp,
    purpose: "FORGOT_PASSWORD",
  });

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // 2️⃣ Generate short-lived reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetToken = resetTokenHash;
  user.passwordResetExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // 3️⃣ Return token to frontend
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resetToken,
      },
      "OTP verified. You can reset your password"
    )
  );
});
const resetPasswordController = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    throw new ApiError(400, "Reset token and new password required");
  }

  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: resetTokenHash,
    passwordResetExpiresAt: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // 1️⃣ Update password
  user.password = newPassword;

  // 2️⃣ Clear reset token
  user.passwordResetToken = null;
  user.passwordResetExpiresAt = null;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
});

// Email verification Controller
const verifyEmailOtpController = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  // 1️⃣ Verify OTP
  await verifyEmailOTP({
    email,
    otp,
    purpose: "EMAIL_VERIFY",
  });

  // 2️⃣ Fetch user
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 3️⃣ Already verified guard
  if (user.emailVerified) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isEmailVerified: true },
          "Email already verified"
        )
      );
  }

  // 4️⃣ Mark verified
  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  // 5️⃣ Respond
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isEmailVerified: true },
        "Email verified successfully"
      )
    );
});
const resendEmailOtpController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // 1️⃣ Find user
  const user = await User.findOne({ email });
  if (!user) {
    // Do NOT reveal user existence details
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If the email exists, a verification OTP has been sent"
        )
      );
  }

  // 2️⃣ Already verified
  if (user.emailVerified) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isEmailVerified: true },
          "Email already verified"
        )
      );
  }

  // 3️⃣ Send OTP
  await sendEmailOTP({
    email: user.email,
    purpose: "EMAIL_VERIFY",
    userName: user.username,
  });

  // 4️⃣ Respond
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Verification OTP resent successfully"));
});
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, deviceId } = req.body;

  console.log("login_body", req.body);

  if (!email || !password || !deviceId) {
    throw new ApiError(400, "Email, password & deviceId are required");
  }

  const result = await loginUserService({ email, password, deviceId });

  // 🔴 Device limit reached
  if (result.status === "DEVICE_LIMIT") {
    return res.status(403).json(
      new ApiResponse(
        403,
        {
          error: "device_limit_reached",
          userId: result.userId,
          devices: result.devices,
          maxDevicesAllowed: result.maxDevicesAllowed,
        },
        "Device limit reached"
      )
    );
  }

  // 🟢 SUCCESS
  const sanitizedUser = sanitizeUser(result.user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizedUser,
        subscription: result.subscription, // Already formatted in service
        wallet: result.wallet, // Provided by service
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      "Login successful"
    )
  );
});

const getUserSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const user = await User.findById(userId).select(
    "currentSubscription wallet.balance devices"
  );

  if (!user) throw new ApiError(404, "User not found");

  const subResponse = formatSubscriptionResponse(
    user.currentSubscription,
    user.wallet?.balance || 0
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscription: subResponse,
        devices: user.devices || [],
        deviceStats: {
          totalDevices: user.devices?.length || 0,
          maxAllowed: user.currentSubscription?.maxDevicesAllowed || 1,
          remaining:
            (user.currentSubscription?.maxDevicesAllowed || 1) -
            (user.devices?.length || 0),
        },
      },
      "Subscription status fetched"
    )
  );
});

// -------------------------------------------------------------
// REMOVE DEVICE (HOTSTAR-STYLE MULTI-DEVICE HANDLING)
// -------------------------------------------------------------
const removeDevice = asyncHandler(async (req, res) => {
  /**
   * NOTES:
   * - Only authenticated user can remove device
   * - deviceId must belong to the user
   * - Removes device entry from user.devices[]
   * - Deletes refreshToken for that device
   * - After this → user can login from a new device immediately
   *
   * Perfect for:
   * - Device limit reached scenario
   * - User managing active devices (like Hotstar)
   */

  //   const userId = req.user._id;
  const { deviceId, userId } = req.body;

  if (!deviceId) {
    throw new ApiError(400, "deviceId is required");
  }

  // 1️⃣ Fetch user
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // 2️⃣ Check if device exists
  const device = user.devices.find((d) => d.deviceId === deviceId);

  if (!device) {
    throw new ApiError(404, "Device not found in your account");
  }

  // 3️⃣ Remove device
  user.devices = user.devices.filter((d) => d.deviceId !== deviceId);

  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        removedDeviceId: deviceId,
        remainingDevices: user.devices,
        maxDevicesAllowed: user.maxDevicesAllowed,
      },
      "Device removed successfully"
    )
  );
});

// -------------------------------------------------------------
// UPDATE DEVICE INFO (firebaseToken, deviceName, technical data)
// -------------------------------------------------------------

const updateDeviceInfo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { firebaseToken, deviceName, deviceInfo = {} } = req.body;

  // console.log("updateDevice_info", req.body);

  if (!deviceInfo.deviceId) {
    throw new ApiError(400, "Device ID missing");
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // Update Firebase Token if provided
  if (firebaseToken !== undefined) {
    user.firebaseToken = firebaseToken;
  }

  const deviceId = deviceInfo.deviceId;
  const idx = user.devices.findIndex((d) => d.deviceId === deviceId);

  // Clean Payload (truncate – only accept valid schema keys)
  const devicePayload = {
    deviceId: deviceInfo.deviceId,
    deviceName: deviceName || deviceInfo.deviceName || "Unknown Device",
    platform: deviceInfo.platform || null,
    model: deviceInfo.model || null,
    osVersion: deviceInfo.osVersion || null,
    manufacturer: deviceInfo.manufacturer || null,
    appVersion: deviceInfo.appVersion || null,
    buildNumber: deviceInfo.buildNumber || null,
    isEmulator: deviceInfo.isEmulator === true ? true : false,

    refreshToken: null, // will be updated on token rotate
    lastActive: Date.now(),
    lastSyncedAt: deviceInfo.lastSyncedAt || null,
  };

  if (idx !== -1) {
    // FULL replace existing device (no leftover keys)
    user.devices[idx] = devicePayload;
  } else {
    // Add new record
    user.devices.push(devicePayload);
  }

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Device info updated successfully"));
});

// -------------------------------------------------------------
// GET CURRENT USER
// -------------------------------------------------------------
const getCurrentUser = asyncHandler(async (req, res) => {
  /**
   * NOTES:
   * - Returns the authenticated user
   * - Auto-refresh premium state if expired
   */

  let user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  // 🔁 Update subscription state if expired (only if needed)
  // user = await refreshPremiumStatus(user);

  // 🎯 Return SAME format as login response
  const responseData = await mapUserResponse(user, {
    includeTokens: false, // NEVER return new token here
  });

  return res.status(200).json({
    statusCode: 200,
    data: responseData,
    message: "User fetched successfully",
    success: true,
  });
});

// -------------------------------------------------------------
// LOGOUT USER
// -------------------------------------------------------------
const logoutUser = asyncHandler(async (req, res) => {
  /**
   * NOTES:
   * - Logs out ONLY the current device
   * - Requires deviceId in request
   * - Clears refreshToken for this device only
   * - Other devices stay logged in
   * - Device entry is NOT removed (Hotstar-style)
   */

  const userId = req.user._id;
  const { deviceId } = req.body;

  if (!deviceId) {
    throw new ApiError(400, "deviceId is required for logout");
  }

  // 1️⃣ Find user
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // 2️⃣ Find the device inside user.devices[]
  const device = user.devices.find((d) => d.deviceId === deviceId);

  if (!device) {
    throw new ApiError(404, "Device entry not found for this user");
  }

  // 3️⃣ Remove refreshToken ONLY for this device
  device.refreshToken = null;

  // Saves only device token cleanup
  await user.save();

  // 4️⃣ Respond success
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logout successful for this device"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken, deviceId } = req.body;

  if (!refreshToken || !deviceId) {
    throw new ApiError(401, "refreshToken & deviceId required");
  }

  // 🔓 1️⃣ Decrypt token received from frontend
  const rawRefreshToken = decryptToken(refreshToken);

  // 2️⃣ Verify JWT validity & expiry
  let decoded;
  try {
    decoded = jwt.verify(rawRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // 3️⃣ Fetch user
  const user = await User.findById(decoded._id);
  if (!user) throw new ApiError(401, "User not found");

  // 4️⃣ Validate refresh token belongs to this device
  const device = user.devices.find((d) => d.deviceId === deviceId);

  if (!device || device.refreshToken !== refreshToken) {
    throw new ApiError(403, "Device mismatch or token invalid");
  }

  // 🔑 5️⃣ Generate NEW JWTs (Plain text temporarily)
  const newAccessToken = jwt.sign(
    { _id: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const newRefreshToken = jwt.sign(
    { _id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "30d" }
  );

  // 🔐 6️⃣ Encrypt both new tokens BEFORE storing + sending
  const encryptedAccessToken = encryptToken(newAccessToken);
  const encryptedRefreshToken = encryptToken(newRefreshToken);

  // 🔄 7️⃣ Store encrypted token for this specific device
  device.refreshToken = encryptedRefreshToken;
  device.lastActive = new Date();

  await user.save({ validateBeforeSave: false });

  // 🟢 8️⃣ Send encrypted tokens only (global encryption middleware will re-encrypt entire payload)
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      },
      "Token refreshed successfully"
    )
  );
});
// -------------------------------------------------------------
// EXPORT ALL CONTROLLERS (READABLE + EASY TO FIND)
// -------------------------------------------------------------
export {
  registerUser,
  loginUser,
  updateDeviceInfo,
  getCurrentUser,
  logoutUser,
  removeDevice,
  refreshAccessToken,
  getUserSubscriptionStatus,
  // Email verification
  verifyEmailOtpController,
  resendEmailOtpController,

  // Forgot password
  verifyForgotPasswordOtpController,
  forgotPasswordController,
  resetPasswordController,
};
