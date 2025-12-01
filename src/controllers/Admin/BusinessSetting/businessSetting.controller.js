import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { BusinessSetting } from "../../../models/Admin/BusinessSetting/businessSetting.model.js";

// 🔹 Ensure default settings exist (Idempotent)
const getOrCreateSettings = async () => {
  let settings = await BusinessSetting.findOne();
  if (!settings) {
    settings = await BusinessSetting.create({});
  }
  return settings;
};

// -------------------------------------------------------------
// GET: Admin fetch current referral settings
// -------------------------------------------------------------
const getReferralSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();

  return res
    .status(200)
    .json(new ApiResponse(200, settings, "Settings fetched successfully"));
});

// -------------------------------------------------------------
// PUT: Admin update referral settings
// -------------------------------------------------------------
const updateReferralSetting = asyncHandler(async (req, res) => {
  const {
    referralNewUserReward,
    referralExistingUserReward,
    referralSystemEnabled,
  } = req.body;

  const settings = await getOrCreateSettings();

  if (referralNewUserReward !== undefined) {
    if (referralNewUserReward < 0)
      throw new ApiError(400, "Reward cannot be negative");
    settings.referralNewUserReward = referralNewUserReward;
  }

  if (referralExistingUserReward !== undefined) {
    if (referralExistingUserReward < 0)
      throw new ApiError(400, "Reward cannot be negative");
    settings.referralExistingUserReward = referralExistingUserReward;
  }

  if (referralSystemEnabled !== undefined) {
    settings.referralSystemEnabled = referralSystemEnabled;
  }

  await settings.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, settings, "Referral settings updated successfully")
    );
});

export { getReferralSettings, updateReferralSetting };
