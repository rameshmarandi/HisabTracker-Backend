import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { applyReferralRewards } from "./referral.service.js";
import { generateAccessTokenAndRefreshToken } from "./tokenGenerateService.js";

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

  const user = await User.create({
    username,
    email,
    password,
    referredBy: referrerUser?._id || null,
    devices: [{ deviceId }],
    maxDevicesAllowed: 1,
  });

  await applyReferralRewards({ newUser: user, referrerUser, referralCode });

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  user.devices[0].refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken, referrerUser };
};
