import { SubscriptionTransactionHistory } from "../../../models/User/TransactionsHistory/subscriptionTransactionHistory.model.js";
import { WalletTransactionHistory } from "../../../models/User/TransactionsHistory/walletTransactionHistory.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

export const getAllTransactions = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
  }

  const walletHistory = await WalletTransactionHistory.find({ user: userId })
    .select("amount type source note createdAt")
    .lean();

  const subscriptionHistory = await SubscriptionTransactionHistory.find({
    user: userId,
  })
    .select(
      "planKey finalPaidAmount walletUsed basePrice discountApplied status createdAt"
    )
    .lean();

  const formattedWallet = walletHistory.map((tx) => ({
    type: "WALLET",
    amount: tx.amount,
    direction: tx.type,
    source: tx.source,
    note: tx.note,
    createdAt: tx.createdAt,
  }));

  const formattedSubscription = subscriptionHistory.map((tx) => ({
    type: "SUBSCRIPTION",
    planKey: tx.planKey,
    finalPaidAmount: tx.finalPaidAmount,
    walletUsed: tx.walletUsed,
    status: tx.status,
    createdAt: tx.createdAt,
  }));

  // 👇 Merge & Sort by latest first
  const merged = [...formattedWallet, ...formattedSubscription].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { transactions: merged },
        "Transaction history fetched"
      )
    );
});
