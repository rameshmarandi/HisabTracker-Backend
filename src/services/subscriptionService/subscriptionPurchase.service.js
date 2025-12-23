import { PLAN_KEYS } from "../../constant.js";
import { SubscriptionPlan } from "../../models/Admin/Subscription/subscriptionPlan.model.js";
import { SubscriptionTransaction } from "../../models/Admin/Subscription/subscriptionTransaction.model.js";
import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ENV } from "../../utils/env.js";
import PaymentService from "../paymentService.js";
import { sendSlackAlert } from "../slackService.js";
import { applyPlanToUser } from "./applySubscription.service.js";
import { refreshPremiumStatus } from "./refreshPremiumStatus.service.js";
// import { sendSlackAlert } from "../../utils/slackAlert.js";

// =====================================================
// 🟦 CREATE ORDER
// =====================================================
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
  // plan.planKey;
  const finalPrice = plan.finalPrice;
  const walletBalance = user.wallet?.balance || 0;

  let walletUsed = 0;
  let payableAmount = finalPrice;

  if (applyWallet && walletBalance > 0) {
    walletUsed = Math.min(walletBalance, finalPrice);
    payableAmount = finalPrice - walletUsed;
  }

  // ✅ WALLET ONLY
  if (payableAmount <= 0) {
    const orderId = `WALLET_ONLY_${Date.now()}`;

    const transaction = await SubscriptionTransaction.create({
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
    });

    if (walletUsed > 0) {
      user.wallet.balance -= walletUsed;
      user.wallet.totalUsedCash += walletUsed;
      await user.save();
    }

    await applyPlanToUser({ user, plan, source: "wallet_only", transaction });

    // 🔔 Slack notification
    sendSlackAlert(
      `🟢 Wallet-only Subscription Success  
      User: ${user.email}  
      Plan: ${plan.name} (${planKey})  
      Wallet Used: ₹${walletUsed}`
    );

    return {
      mode: "WALLET_ONLY",
      transactionId: transaction._id,
      orderId: transaction.orderId,
      payableAmount: 0,
      walletUsed,
    };
  }

  // 💳 RAZORPAY ORDER
  try {
    const paymentService = new PaymentService("razorpay");
    const order = await paymentService.createOrder(payableAmount);

    console.log("Order_createion", order, plan);
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

// =====================================================
// 🟪 VERIFY PAYMENT
// =====================================================
export const verifySubscriptionPaymentService = async ({
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const transaction = await SubscriptionTransaction.findOne({
    orderId: razorpay_order_id,
    userId,
  });

  if (!transaction) throw new ApiError(404, "Transaction not found");

  if (transaction.status === "SUCCESS") return { alreadyProcessed: true };

  const user = await User.findById(userId);
  const plan = await SubscriptionPlan.findById(transaction.planId).populate(
    "features.featureId"
  );

  const paymentService = new PaymentService("razorpay");
  const isValid = await paymentService.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  // ❌ Failed Payment
  if (!isValid) {
    transaction.status = "FAILED";
    transaction.failureReason = "Invalid signature";
    await transaction.save();

    // 🔔 Slack Alert
    sendSlackAlert(
      `🔴 Payment Signature Failed  
      User: ${user.email}  
      Plan: ${transaction.planName}  
      OrderID: ${razorpay_order_id}`
    );

    return { success: false };
  }

  // ✅ SUCCESS
  transaction.status = "SUCCESS";
  transaction.paymentId = razorpay_payment_id;
  transaction.signature = razorpay_signature;
  await transaction.save();

  if (transaction.walletUsed > 0) {
    user.wallet.balance -= transaction.walletUsed;
    user.wallet.totalUsedCash += transaction.walletUsed;
    await user.save();
  }

  await applyPlanToUser({ user, plan, source: "payment", transaction });
  await refreshPremiumStatus(user);

  sendSlackAlert(
    `🟣 Subscription Activated  
    User: ${user.email}  
    Plan: ${transaction.planName} (${transaction.planKey})  
    Paid: ₹${transaction.payableAmount} Wallet: ₹${transaction.walletUsed}`
  );

  return { success: true, transaction };
};
