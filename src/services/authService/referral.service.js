import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { BusinessSetting } from "../../models/Admin/BusinessSetting/businessSetting.model.js";
import { WalletTransactionHistory } from "../../models/User/TransactionsHistory/walletTransactionHistory.model.js";

/**
 * Apply referral rewards ONCE and atomically
 */
export const applyReferralRewards = async ({
  newUser,
  referrerUser,
  referralCode,
}) => {
  console.log("apply_refearil", {
    newUser,
    referrerUser,
    referralCode,
  });
  // Basic guards
  if (!newUser || !referrerUser) {
    console.warn("Referral skipped due to missing user", {
      newUser: !!newUser,
      referrerUser: !!referrerUser,
    });
    return;
  }

  // Prevent self referral
  if (String(newUser._id) === String(referrerUser._id)) return;

  // Prevent duplicate reward
  if (newUser.referral?.rewarded === true) return;

  // Load business settings (do not auto-create in production)
  const settings = await BusinessSetting.findOne().lean();
  if (!settings || settings.referralSystemEnabled !== true) return;

  const newUserAmount = Number(settings.referralNewUserReward || 0);
  const referrerAmount = Number(settings.referralExistingUserReward || 0);

  // Nothing to credit
  if (newUserAmount <= 0 && referrerAmount <= 0) return;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const rewardRef = uuidv4();

    // Credit new user
    if (newUserAmount > 0) {
      newUser.wallet.balance += newUserAmount;
      newUser.wallet.totalEarnedCash += newUserAmount;

      await WalletTransactionHistory.create(
        [
          {
            user: newUser._id,
            amount: newUserAmount,
            type: "CREDIT",
            source: "REFERRAL_NEW_USER",
            referenceId: `REF_NEW_${rewardRef}`,
            note: `Referral code used: ${referralCode}`,
          },
        ],
        { session }
      );
    }

    // Credit referrer
    if (referrerAmount > 0) {
      referrerUser.wallet.balance += referrerAmount;
      referrerUser.wallet.totalEarnedCash += referrerAmount;

      await WalletTransactionHistory.create(
        [
          {
            user: referrerUser._id,
            amount: referrerAmount,
            type: "CREDIT",
            source: "REFERRAL_EXISTING_USER",
            referenceId: `REF_EXIST_${rewardRef}`,
            note: `${newUser.username} joined using your referral`,
          },
        ],
        { session }
      );
    }

    // Lock referral usage on new user
    newUser.referral = {
      codeUsed: referralCode,
      rewarded: true,
      rewardedAt: new Date(),
    };

    await newUser.save({ session });
    await referrerUser.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
