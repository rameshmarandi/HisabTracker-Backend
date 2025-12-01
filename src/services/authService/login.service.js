// services/authService/login.service.js

import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { refreshPremiumStatus } from "../subscriptionService/refreshPremiumStatus.service.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";

export const loginUserService = async ({ email, password, deviceId }) => {
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

  // 🟢 1. EXISTING DEVICE → update lastActive + replace refreshToken
  if (existingDevice) {
    existingDevice.lastActive = Date.now();

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    existingDevice.refreshToken = refreshToken;
    await user.save();

    return {
      type: "SUCCESS",
      user,
      accessToken,
      refreshToken,
    };
  }

  // 🟡 2. NEW DEVICE + LIMIT NOT REACHED → ADD DEVICE
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

    return {
      type: "SUCCESS",
      user,
      accessToken,
      refreshToken,
    };
  }

  // 🔴 3. NEW DEVICE + LIMIT REACHED → BLOCK LOGIN
  if (isNewDevice && deviceLimitReached) {
    return {
      type: "DEVICE_LIMIT",
      userId: user._id,
      maxDevicesAllowed: user.maxDevicesAllowed,
      devices: user.devices.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        lastActive: d.lastActive,
      })),
    };
  }

  // Fallback (should never hit)
  throw new ApiError(500, "Unexpected login state");
};
