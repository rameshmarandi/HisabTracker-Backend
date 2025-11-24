import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";
import { AdminSetting } from "../models/Admin/AdminSetting/adminSettings.model.js";
import { TransactionHistory } from "../models/User/CoinTransactions/transactionHistory.model.js";
import { User } from "../models/User/Auth/user.model.js";

export const applySignupBonusesAndReferral = async (user, referralCode) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const adminSettings = await AdminSetting.findOne().lean();
  if (!adminSettings) throw new ApiError(400, "Admin settings not found");

  const {
    defaultSignupCoins = 0,
    referralBonusForNewUser = 0,
    referralBonusForReferreCodeOwner = 0,
  } = adminSettings;

  // Join bonus
  if (defaultSignupCoins > 0) {
    const joiningBonus = parseFloat(defaultSignupCoins);
    const balanceBeforeJoin = user.walletBalance;

    user.walletBalance = parseFloat(
      (user.walletBalance + joiningBonus).toFixed(1)
    );
    await user.save({ session });

    await TransactionHistory.create(
      [
        {
          user: user._id,
          type: "JOIN_BONUS",
          amount: 0,
          noOfCoins: joiningBonus,
          balanceBefore: balanceBeforeJoin,
          balanceAfter: user.walletBalance,
          createdBy: user._id,
          status: "COMPLETED",
          isSystemGenerated: true,
          remarks: "Join bonus credited",
          metadata: {
            referenceId: `join_bonus_${user._id}`,
            trigger: "user_signup",
            source: "system",
            orderId: null,
            notes: "System-generated join bonus for new user signup",
          },
        },
      ],
      { session }
    );
  }

  // Referral logic
  if (referralCode?.trim()) {
    const referalOwner = await User.findOne(
      { referralCode: referralCode.trim() },
      "_id walletBalance"
    ).session(session);

    if (referalOwner) {
      // Bonus to new user
      if (referralBonusForNewUser > 0) {
        const balanceBeforeReferral = user.walletBalance;
        user.walletBalance = parseFloat(
          (user.walletBalance + referralBonusForNewUser).toFixed(1)
        );
        await user.save({ session });

        await TransactionHistory.create(
          [
            {
              user: user._id,
              type: "REFERRAL_BONUS",
              amount: 0,
              noOfCoins: referralBonusForNewUser,
              balanceBefore: balanceBeforeReferral,
              balanceAfter: user.walletBalance,
              createdBy: user._id,
              status: "COMPLETED",
              remarks: "Referral bonus credited to new user",
              isSystemGenerated: true,
              metadata: {
                referenceId: `referral_bonus_${user._id}`,
                trigger: "user_signup_with_referral",
                source: "system",
                orderId: null,
                notes:
                  "System credited referral bonus to the referred user on signup",
              },
            },
          ],
          { session }
        );
      }

      // Bonus to referral owner
      if (referralBonusForReferreCodeOwner > 0) {
        const balanceBeforeOwner = referalOwner.walletBalance;
        referalOwner.walletBalance = parseFloat(
          (
            referalOwner.walletBalance + referralBonusForReferreCodeOwner
          ).toFixed(1)
        );
        await referalOwner.save({ session });

        await TransactionHistory.create(
          [
            {
              user: referalOwner._id,
              type: "REFERRAL_EARNINGS",
              amount: 0,
              noOfCoins: referralBonusForReferreCodeOwner,
              balanceBefore: balanceBeforeOwner,
              balanceAfter: referalOwner.walletBalance,
              createdBy: referalOwner._id,
              status: "COMPLETED",
              remarks: "Referral earnings credited to referral owner",
              isSystemGenerated: true,
              metadata: {
                referenceId: `referral_earn_${referalOwner._id}`,
                trigger: "referral_signup_bonus",
                source: "system",
                orderId: null,
                notes:
                  "User referred someone who signed up; referral earning credited.",
              },
            },
          ],
          { session }
        );
      }
    }
  }

  await session.commitTransaction();
  session.endSession();
};
