import { BusinessSetting } from "../../models/Admin/BusinessSetting/businessSetting.model.js";
import { WalletTransactionHistory } from "../../models/User/TransactionsHistory/walletTransactionHistory.model.js";

export const applyReferralRewards = async ({
  newUser,
  referrerUser,
  referralCode,
}) => {
  if (!referrerUser) return;

  let settings = await BusinessSetting.findOne();
  if (!settings) settings = await BusinessSetting.create({});

  if (!settings.referralSystemEnabled) return;

  const newAmount = settings.referralNewUserReward ?? 0;
  const existingAmount = settings.referralExistingUserReward ?? 0;

  // New User
  newUser.wallet.balance += newAmount;
  newUser.wallet.totalEarnedCash += newAmount;

  await WalletTransactionHistory.create({
    user: newUser._id,
    amount: newAmount,
    type: "CREDIT",
    source: "REFERRAL_NEW_USER",
    note: `Used referral code: ${referralCode}`,
  });

  // Referrer
  referrerUser.wallet.balance += existingAmount;
  referrerUser.wallet.totalEarnedCash += existingAmount;

  await WalletTransactionHistory.create({
    user: referrerUser._id,
    amount: existingAmount,
    type: "CREDIT",
    source: "REFERRAL_EXISTING_USER",
    note: `${newUser.username} used your referral code`,
  });

  await referrerUser.save();
};
