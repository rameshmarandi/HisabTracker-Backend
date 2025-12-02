import {
  createSubscriptionOrderService,
  verifySubscriptionPaymentService,
} from "../../../services/subscriptionService/subscriptionPurchase.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { planId, applyWallet } = req.body;

  if (!userId) throw new ApiError(401, "Unauthorized");
  if (!planId) throw new ApiError(400, "Plan ID is required");

  const result = await createSubscriptionOrderService({
    userId,
    planId,
    applyWallet: !!applyWallet,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, result, "Subscription order created"));
});

const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Payment details are required");
  }

  const { success, alreadyProcessed, transaction, user } =
    await verifySubscriptionPaymentService({
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

  if (alreadyProcessed) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { transaction },
          "Payment already processed earlier"
        )
      );
  }

  if (!success) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          { transaction },
          "Payment verification failed. Subscription not activated."
        )
      );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        transaction,
        user, // updated user with new currentSubscription
      },
      "Payment verified & subscription activated"
    )
  );
});

export { createSubscriptionOrder, verifySubscriptionPayment };
