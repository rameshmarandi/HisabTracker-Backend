// services/authService/login.service.js

import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { refreshPremiumStatus } from "../subscriptionService/refreshPremiumStatus.service.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";

export const loginUserService = async ({ email, password, deviceId }) => {
  // 1️⃣ Fetch user including password
  let user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  // 2️⃣ Validate password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  // 3️⃣ Validate account state
  if (user.status !== "active") {
    throw new ApiError(403, "Your account is not active");
  }

  // 4️⃣ Auto Expiry Check → update subscription if needed
  user = await refreshPremiumStatus(user);

  // ⚠️ Extract subscription limits properly
  const maxDevicesAllowed = user.currentSubscription.maxDevicesAllowed;
  const existingDevice = user.devices.find((d) => d.deviceId === deviceId);
  const isNewDevice = !existingDevice;
  const deviceLimitReached = user.devices.length >= maxDevicesAllowed;

  // 🟢 EXISTING DEVICE LOGIN
  if (existingDevice) {
    existingDevice.lastActive = Date.now();

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    existingDevice.refreshToken = refreshToken;
    await user.save();

    return {
      status: "SUCCESS",
      user,
      accessToken,
      refreshToken,
    };
  }

  // 🟡 NEW DEVICE + DEVICE SLOT AVAILABLE
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
      status: "SUCCESS",
      user,
      accessToken,
      refreshToken,
    };
  }

  // 🔴 NEW DEVICE + LIMIT REACHED → BLOCK LOGIN
  if (isNewDevice && deviceLimitReached) {
    return {
      status: "DEVICE_LIMIT",
      userId: user._id,
      maxDevicesAllowed,
      devices: user.devices.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        lastActive: d.lastActive,
      })),
    };
  }

  throw new ApiError(500, "Unexpected login state");
};
