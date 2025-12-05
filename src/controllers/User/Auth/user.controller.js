import { User } from "../../../models/User/Auth/user.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { registerUserService } from "../../../services/authService/register.service.js";
import { loginUserService } from "../../../services/authService/login.service.js";
import { refreshPremiumStatus } from "../../../services/subscriptionService/refreshPremiumStatus.service.js";
import jwt from "jsonwebtoken";
import { decryptToken, encryptToken } from "../../../utils/TokenCrypto.js";

// -------------------------------------------------------------
// HELPER — Refresh Premium if Expired
// -------------------------------------------------------------

const sanitizeUser = (user) => {
  if (!user) return null;

  const u = user.toObject();

  // Remove sensitive fields
  delete u.password;
  delete u.refreshToken;
  delete u.__v;
  delete u.syncToken;

  // Remove device refresh tokens
  if (u.devices && Array.isArray(u.devices)) {
    u.devices = u.devices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      lastActive: d.lastActive,
      lastSyncedAt: d.lastSyncedAt,
      _id: d._id,
    }));
  }

  // Clean wallet
  if (u.wallet) {
    delete u.wallet._id;
    delete u.wallet.totalUsedCash;
  }

  // Clean subscription object
  if (u.currentSubscription) {
    delete u.currentSubscription._id;
    delete u.currentSubscription.isExpired; // internal-only
    delete u.currentSubscription.internalNotes; // if future added
  }

  return u;
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, deviceId, referralCode } = req.body;

  if (!username || !email || !password || !deviceId) {
    throw new ApiError(400, "Username, email, password & deviceId required");
  }

  const { user, accessToken, refreshToken, referrerUser } =
    await registerUserService({
      username,
      email,
      password,
      deviceId,
      referralCode,
    });

  const sanitized = sanitizeUser(user);
  sanitized.walletBalance = user.wallet?.balance || 0;

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: sanitized, accessToken, refreshToken },
        referrerUser
          ? "Registered successfully. Referral applied & wallet credited."
          : "Registered successfully"
      )
    );
});
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password || !deviceId) {
    throw new ApiError(400, "Email, password & deviceId are required");
  }

  const result = await loginUserService({ email, password, deviceId });

  // 🔴 Device limit reached → block login
  if (result.status === "DEVICE_LIMIT") {
    return res.status(403).json(
      new ApiResponse(
        403,
        {
          error: "device_limit_reached",
          userId: result.userId,
          message:
            "You have reached your device limit. Remove a device to continue.",
          devices: result.devices,
          maxDevicesAllowed: result.maxDevicesAllowed,
        },
        "Device limit reached"
      )
    );
  }

  // 🟢 Successful login
  const sanitized = sanitizeUser(result.user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitized,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      "Login successful"
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
// const updateDeviceInfo = asyncHandler(async (req, res) => {
//   /**
//    * NOTES:
//    * - Called AFTER login
//    * - Updates firebase token for push notifications
//    * - Stores deviceName (shown in UI)
//    * - Updates platform, OS version, build number, model, etc.
//    * - Does NOT perform device limit validation
//    */

//   const userId = req.user._id;

//   const { firebaseToken, deviceName, deviceInfo = {} } = req.body;

//   console.log("updateInf_body", req.body);

//   const user = await User.findById(userId);
//   if (!user) throw new ApiError(404, "User not found");

//   if (firebaseToken) user.firebaseToken = firebaseToken;

//   if (deviceName && deviceInfo.deviceId) {
//     const idx = user.devices.findIndex(
//       (d) => d.deviceId === deviceInfo.deviceId
//     );
//     if (idx !== -1) user.devices[idx].deviceName = deviceName;
//   }

//   user.deviceInfo = {
//     ...user.deviceInfo,
//     ...deviceInfo,
//   };

//   await user.save();

//   return res
//     .status(200)
//     .json(new ApiResponse(200, { user }, "Device info updated successfully"));
// });

// const updateDeviceInfo = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   const { firebaseToken, deviceName, deviceInfo = {} } = req.body;

//   if (!deviceInfo.deviceId) {
//     throw new ApiError(400, "Device ID missing");
//   }

//   const user = await User.findById(userId);
//   if (!user) throw new ApiError(404, "User not found");

//   // Update Firebase Token if provided
//   if (firebaseToken !== undefined) {
//     user.firebaseToken = firebaseToken;
//   }

//   const deviceId = deviceInfo.deviceId;
//   const idx = user.devices.findIndex((d) => d.deviceId === deviceId);

//   const devicePayload = {
//     ...deviceInfo,
//     deviceName: deviceName || deviceInfo.deviceName || "Unknown Device",
//     lastActive: Date.now(),
//   };

//   if (idx !== -1) {
//     // Update existing device
//     user.devices[idx] = {
//       ...user.devices[idx]._doc,
//       ...devicePayload,
//     };
//   } else {
//     // Add new device
//     user.devices.push(devicePayload);
//   }

//   await user.save();

//   return res
//     .status(200)
//     .json(new ApiResponse(200, { user }, "Device info updated successfully"));
// });

const updateDeviceInfo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { firebaseToken, deviceName, deviceInfo = {} } = req.body;

  console.log("updateDevice_info", req.body);

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

  user = await refreshPremiumStatus(user);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
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
};
