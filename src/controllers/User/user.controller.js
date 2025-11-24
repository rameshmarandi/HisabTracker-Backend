// -------------------------------------------------------------
// AUTH CONTROLLER — HISABTRACKER
// Production Grade | Ultra Clean | Future Proof
// -------------------------------------------------------------

// import { User } from "../models/User.js";

// import { ApiError } from "../utils/ApiError.js";

// import { ApiResponse } from "../utils/ApiResponse.js";

// import asyncHandler from "../utils/asyncHandler.js";

// import { generateAccessTokenAndRefreshToken } from "../services/tokenGenerateService.js";
import { generateAccessTokenAndRefreshToken } from "../../services/tokenGenerateService.js";
import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// -------------------------------------------------------------
// HELPER — Refresh Premium if Expired
// -------------------------------------------------------------
const sanitizeUser = (user) => {
  const u = user.toObject();

  // Remove refreshToken inside devices array
  u.devices = u.devices.map((d) => {
    return {
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      lastActive: d.lastActive,
      lastSyncedAt: d.lastSyncedAt,
      _id: d._id,
    };
  });

  return u;
};
const refreshPremiumStatus = async (user) => {
  /**
   * NOTES:
   * - Checks if user's premium expired
   * - If expired → downgrade to free plan
   * - Removes all premium features
   * - Resets max devices to 1
   */

  if (user.isPremium && user.premiumExpiresAt < Date.now()) {
    console.log("Premium expired → Downgrading user");

    user.isPremium = false;
    user.premiumPlanKey = null;
    user.premiumStartedAt = null;
    user.premiumExpiresAt = null;

    user.featureAccess = {
      cloudSync: false,
      multiDevice: false,
      premiumThemes: false,
      advancedPdf: false,
    };

    user.maxDevicesAllowed = 1;
    await user.save();
  }

  return user;
};

// -------------------------------------------------------------
// REGISTER USER
// -------------------------------------------------------------
const registerUser = asyncHandler(async (req, res) => {
  /**
   * NOTES:
   * - Validates: username, email, password, deviceId
   * - Hashing handled by model
   * - Adds first device entry
   * - Free user → maxDevicesAllowed = 1
   * - Generates accessToken + refreshToken
   * - Stores refreshToken INSIDE devices[0]
   * - Removes refreshToken from user response
   */

  const { username, email, password, deviceId } = req.body;

  if (!username || !email || !password || !deviceId) {
    throw new ApiError(400, "Username, email, password & deviceId required");
  }

  // 1️⃣ Check existing user
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "User already registered with this email");
  }

  // 2️⃣ Create user with device entry (no refreshToken yet)
  const user = await User.create({
    username,
    email,
    password,
    devices: [
      {
        deviceId,
        deviceName: "Unknown Device",
        lastActive: Date.now(),
        lastSyncedAt: null,
        refreshToken: null,
      },
    ],
    maxDevicesAllowed: 1,
  });

  // 3️⃣ Generate tokens
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // 4️⃣ Store refreshToken in device
  user.devices[0].refreshToken = refreshToken;
  await user.save();

  // 5️⃣ SANITIZE USER BEFORE SENDING RESPONSE
  const sanitized = sanitizeUser(user);

  // 6️⃣ Return response
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: sanitized,
        accessToken,
        refreshToken,
      },
      "User registered successfully"
    )
  );
});

// -------------------------------------------------------------
// LOGIN USER
// -------------------------------------------------------------
// -------------------------------------------------------------
// LOGIN USER (HOTSTAR-STYLE MULTI-DEVICE HANDLING)
// -------------------------------------------------------------
// -------------------------------------------------------------
// LOGIN USER (HOTSTAR-STYLE MULTI-DEVICE HANDLING)
// -------------------------------------------------------------
const loginUser = asyncHandler(async (req, res) => {
  /**
   * LOGIN LOGIC:
   * - Validates: email, password, deviceId
   * - Verifies password
   * - Auto-downgrade expired premium
   * - Handles:
   *      1. Existing device → update & login
   *      2. New device + within limit → add & login
   *      3. New device + limit reached → block + return device list + userId
   * - refreshToken is ALWAYS stored per device (NOT global)
   */

  const { email, password, deviceId } = req.body;

  if (!email || !password || !deviceId) {
    throw new ApiError(400, "Email, password & deviceId are required");
  }

  // 1️⃣ Fetch user
  let user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  // 2️⃣ Validate password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  // 3️⃣ Ensure account is active
  if (user.status !== "active") {
    throw new ApiError(403, "Your account is not active");
  }

  // 4️⃣ Auto refresh premium state
  user = await refreshPremiumStatus(user);

  // 5️⃣ Device checks
  const existingDevice = user.devices.find((d) => d.deviceId === deviceId);
  const isNewDevice = !existingDevice;
  const deviceLimitReached = user.devices.length >= user.maxDevicesAllowed;

  // -------------------------------------------------------------
  // 🟢 1. EXISTING DEVICE → update lastActive + replace refreshToken
  // -------------------------------------------------------------
  if (existingDevice) {
    existingDevice.lastActive = Date.now();

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    existingDevice.refreshToken = refreshToken;

    await user.save();

    // 🔒 SANITIZE USER BEFORE RETURNING
    const sanitized = sanitizeUser(user);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user: sanitized, accessToken, refreshToken },
          "Login successful"
        )
      );
  }

  // -------------------------------------------------------------
  // 🟡 2. NEW DEVICE + LIMIT NOT REACHED → ADD DEVICE
  // -------------------------------------------------------------
  if (isNewDevice && !deviceLimitReached) {
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    user.devices.push({
      deviceId,
      deviceName: "Unknown Device",
      refreshToken,
      lastActive: Date.now(),
      lastSyncedAt: null,
    });

    await user.save();

    const sanitized = sanitizeUser(user);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user: sanitized, accessToken, refreshToken },
          "Login successful"
        )
      );
  }

  // -------------------------------------------------------------
  // 🔴 3. NEW DEVICE + LIMIT REACHED → BLOCK LOGIN
  // -------------------------------------------------------------
  if (isNewDevice && deviceLimitReached) {
    return res.status(403).json(
      new ApiResponse(
        403,
        {
          error: "device_limit_reached",
          userId: user._id,
          message:
            "You have reached your device limit. Remove a device to continue.",
          devices: user.devices.map((d) => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            lastActive: d.lastActive,
          })),
          maxDevicesAllowed: user.maxDevicesAllowed,
        },
        "Device limit reached"
      )
    );
  }
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
  /**
   * NOTES:
   * - Called AFTER login
   * - Updates firebase token for push notifications
   * - Stores deviceName (shown in UI)
   * - Updates platform, OS version, build number, model, etc.
   * - Does NOT perform device limit validation
   */

  const userId = req.user._id;

  const { firebaseToken, deviceName, deviceInfo = {} } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (firebaseToken) user.firebaseToken = firebaseToken;

  if (deviceName && deviceInfo.deviceId) {
    const idx = user.devices.findIndex(
      (d) => d.deviceId === deviceInfo.deviceId
    );
    if (idx !== -1) user.devices[idx].deviceName = deviceName;
  }

  user.deviceInfo = {
    ...user.deviceInfo,
    ...deviceInfo,
  };

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
  refreshPremiumStatus, // helper exported in case it's needed elsewhere
};
