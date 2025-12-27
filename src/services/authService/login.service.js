import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { refreshPremiumStatus } from "../subscriptionService/refreshPremiumStatus.service.js";
import { formatSubscriptionResponse } from "./subscriptionFormatter.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";
import { sendEmailOTP } from "./emailOtp.service.js";

export const loginUserService = async ({ email, password, deviceId }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 1️⃣ Account status
  if (user.status !== "active") {
    throw new ApiError(403, "Your account is not active");
  }

  // 2️⃣ Email verification gate
  if (!user.emailVerified) {
    // Backend generates & sends OTP
    await sendEmailOTP({
      email: user.email,
      purpose: "EMAIL_VERIFY",
      userName: user.username,
      trigger: "LOGIN",
    });

    return {
      status: "EMAIL_NOT_VERIFIED",
      email: user.email,
    };
  }

  // 3️⃣ Password check
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // 4️⃣ Refresh subscription state
  const refreshedUser = await refreshPremiumStatus(user);

  const maxDevicesAllowed =
    refreshedUser.currentSubscription?.maxDevicesAllowed ?? 1;

  const existingDevice = refreshedUser.devices.find(
    (d) => d.deviceId === deviceId
  );

  const deviceLimitReached = refreshedUser.devices.length >= maxDevicesAllowed;

  const successAuth = async () => {
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(refreshedUser._id);

    if (existingDevice) {
      existingDevice.lastActive = Date.now();
      existingDevice.refreshToken = refreshToken;
    } else {
      refreshedUser.devices.push({
        deviceId,
        deviceName: "Unknown Device",
        lastActive: Date.now(),
        refreshToken,
      });
    }

    await refreshedUser.save();

    return {
      status: "SUCCESS",
      user: refreshedUser,
      subscription: formatSubscriptionResponse(
        refreshedUser.currentSubscription,
        refreshedUser.wallet?.balance || 0
      ),
      wallet: {
        balance: refreshedUser.wallet?.balance || 0,
        totalEarnedCash: refreshedUser.wallet?.totalEarnedCash || 0,
      },
      accessToken,
      refreshToken,
    };
  };

  if (existingDevice) return await successAuth();
  if (!existingDevice && !deviceLimitReached) return await successAuth();

  if (!existingDevice && deviceLimitReached) {
    return {
      status: "DEVICE_LIMIT",
      userId: refreshedUser._id,
      maxDevicesAllowed,
      devices: refreshedUser.devices.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        lastActive: d.lastActive,
      })),
    };
  }

  throw new ApiError(500, "Unexpected login state");
};
