import mongoose from "mongoose";
import { PLAN_KEYS } from "../../constant.js";
import { SubscriptionPlan } from "../../models/Admin/Subscription/subscriptionPlan.model.js";
import { SubscriptionTransaction } from "../../models/Admin/Subscription/subscriptionTransaction.model.js";
import { WalletTransactionHistory } from "../../models/User/TransactionsHistory/walletTransactionHistory.model.js";
import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ENV } from "../../utils/env.js";
import PaymentService from "../paymentService.js";
import { sendSlackAlert } from "../slackService.js";
import { applyPlanToUser } from "./applySubscription.service.js";
import { refreshPremiumStatus } from "./refreshPremiumStatus.service.js";

/**
 * CREATE SUBSCRIPTION ORDER
 */
export const createSubscriptionOrderService = async ({
  userId,
  planId,
  applyWallet = false,
}) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) throw new ApiError(404, "Plan not found");

  if (plan.planKey === PLAN_KEYS.FREE || plan.finalPrice <= 0) {
    throw new ApiError(400, "Free plan cannot be purchased");
  }

  const planKey = plan.durationInDays;
  const finalPrice = plan.finalPrice;
  const walletBalance = user.wallet?.balance || 0;

  let walletUsed = 0;
  let payableAmount = finalPrice;

  if (applyWallet && walletBalance > 0) {
    walletUsed = Math.min(walletBalance, finalPrice);
    payableAmount = finalPrice - walletUsed;
  }

  /**
   * ======================
   * WALLET ONLY FLOW
   * ======================
   */
  if (payableAmount <= 0) {
    const orderId = `WALLET_ONLY_${Date.now()}`;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const existingTxn = await SubscriptionTransaction.findOne(
        { orderId, userId },
        null,
        { session }
      );

      if (existingTxn) {
        await session.commitTransaction();
        return {
          mode: "WALLET_ONLY",
          transactionId: existingTxn._id,
          orderId: existingTxn.orderId,
          payableAmount: 0,
          walletUsed: existingTxn.walletUsed,
        };
      }

      const [transaction] = await SubscriptionTransaction.create(
        [
          {
            userId,
            planId,
            planName: plan.name,
            planKey,
            durationInDays: plan.durationInDays,
            basePrice: plan.basePrice,
            discountPercent: plan.discountPercent,
            finalPrice,
            walletUsed,
            payableAmount: 0,
            provider: "wallet_only",
            orderId,
            status: "SUCCESS",
          },
        ],
        { session }
      );

      if (walletUsed > 0) {
        const refId = `SUB_WALLET_${orderId}`;

        const alreadyDebited = await WalletTransactionHistory.findOne(
          { referenceId: refId },
          null,
          { session }
        );

        if (!alreadyDebited) {
          user.wallet.balance -= walletUsed;
          user.wallet.totalUsedCash += walletUsed;

          await WalletTransactionHistory.create(
            [
              {
                user: user._id,
                amount: walletUsed,
                type: "DEBIT",
                source: "SUBSCRIPTION_PURCHASE",
                referenceId: refId,
                note: "Subscription purchase using wallet",
              },
            ],
            { session }
          );

          await user.save({ session });
        }
      }

      await applyPlanToUser({
        user,
        plan,
        source: "wallet_only",
        transaction,
        session,
      });

      await session.commitTransaction();

      sendSlackAlert(
        `🟢 Wallet-only Subscription Success  
        User: ${user.email}  
        Plan: ${plan.name}  
        Wallet Used: ₹${walletUsed}`
      );

      return {
        mode: "WALLET_ONLY",
        transactionId: transaction._id,
        orderId,
        payableAmount: 0,
        walletUsed,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * ======================
   * RAZORPAY FLOW
   * ======================
   */
  try {
    const paymentService = new PaymentService("razorpay");
    const order = await paymentService.createOrder(payableAmount);

    await SubscriptionTransaction.create({
      userId,
      planId,
      planName: plan.name,
      planKey,
      durationInDays: plan.durationInDays,
      basePrice: plan.basePrice,
      discountPercent: plan.discountPercent,
      finalPrice,
      walletUsed,
      payableAmount,
      provider: "razorpay",
      orderId: order.id,
      status: "PENDING",
    });

    return {
      mode: "RAZORPAY",
      razorpayKey: ENV.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: payableAmount,
      currency: order.currency,
      walletUsed,
      finalPrice,
    };
  } catch (err) {
    sendSlackAlert(
      `🚨 Razorpay Order Creation Failed  
      User: ${user.email}  
      Plan: ${plan.name}  
      Error: ${err.message}`
    );
    throw new ApiError(500, "Payment order creation failed");
  }
};

/**
 * VERIFY PAYMENT
 */
export const verifySubscriptionPaymentService = async ({
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const transaction = await SubscriptionTransaction.findOne(
      { orderId: razorpay_order_id, userId },
      null,
      { session }
    );

    if (!transaction) throw new ApiError(404, "Transaction not found");

    if (transaction.status === "SUCCESS") {
      await session.commitTransaction();
      return { alreadyProcessed: true, transaction };
    }

    const user = await User.findById(userId).session(session);
    const plan = await SubscriptionPlan.findById(transaction.planId)
      .populate("features.featureId")
      .session(session);

    const paymentService = new PaymentService("razorpay");
    const isValid = await paymentService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      transaction.status = "FAILED";
      transaction.failureReason = "Invalid signature";
      await transaction.save({ session });
      await session.commitTransaction();
      return { success: false, transaction };
    }

    transaction.status = "SUCCESS";
    transaction.paymentId = razorpay_payment_id;
    transaction.signature = razorpay_signature;
    await transaction.save({ session });

    if (transaction.walletUsed > 0) {
      const refId = `SUB_WALLET_${transaction.orderId}`;

      const alreadyDebited = await WalletTransactionHistory.findOne(
        { referenceId: refId },
        null,
        { session }
      );

      if (!alreadyDebited) {
        user.wallet.balance -= transaction.walletUsed;
        user.wallet.totalUsedCash += transaction.walletUsed;

        await WalletTransactionHistory.create(
          [
            {
              user: user._id,
              amount: transaction.walletUsed,
              type: "DEBIT",
              source: "SUBSCRIPTION_PURCHASE",
              referenceId: refId,
              note: "Subscription purchase wallet usage",
            },
          ],
          { session }
        );

        await user.save({ session });
      }
    }

    await applyPlanToUser({
      user,
      plan,
      source: "payment",
      transaction,
      session,
    });

    await refreshPremiumStatus(user, session);

    await session.commitTransaction();

    sendSlackAlert(
      `🟣 Subscription Activated  
      User: ${user.email}  
      Plan: ${transaction.planName}  
      Paid: ₹${transaction.payableAmount} Wallet: ₹${transaction.walletUsed}`
    );

    return { success: true, transaction };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
