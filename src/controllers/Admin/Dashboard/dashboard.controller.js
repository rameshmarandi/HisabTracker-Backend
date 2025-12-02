import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import mongoose from "mongoose";
import { SubscriptionTransaction } from "../../../models/Admin/Subscription/subscriptionTransaction.model.js";

// -------------------------------------------------------------
// HELPER — Sanitize Transaction Data
// -------------------------------------------------------------

const sanitizeTransaction = (transaction) => {
  if (!transaction) return null;

  const t = transaction.toObject();

  // Remove MongoDB internal fields
  delete t.__v;

  // Format dates
  if (t.createdAt) t.createdAt = new Date(t.createdAt).toISOString();
  if (t.updatedAt) t.updatedAt = new Date(t.updatedAt).toISOString();

  // Format user data if populated
  if (t.userId && typeof t.userId === "object") {
    t.user = {
      id: t.userId._id,
      name: t.userId.name,
      email: t.userId.email,
      phone: t.userId.phone,
      avatar: t.userId.avatar,
    };
    delete t.userId;
  }

  // Format plan data if populated
  if (t.planId && typeof t.planId === "object") {
    t.plan = {
      id: t.planId._id,
      name: t.planId.name,
      description: t.planId.description,
      features: t.planId.features,
      isActive: t.planId.isActive,
    };
    delete t.planId;
  }

  return t;
};

// -------------------------------------------------------------
// HELPER — Build Filter Query
// -------------------------------------------------------------

const buildTransactionFilter = (filterData = {}) => {
  const {
    userId,
    planId,
    planKey,
    status,
    provider,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    paymentId,
    orderId,
  } = filterData;

  const filter = {};

  // Filter by user ID
  if (userId) {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
  }

  // Filter by plan ID
  if (planId) {
    if (mongoose.Types.ObjectId.isValid(planId)) {
      filter.planId = new mongoose.Types.ObjectId(planId);
    }
  }

  // Filter by plan key
  if (planKey) {
    filter.planKey = planKey;
  }

  // Filter by status
  if (status) {
    filter.status = status.toUpperCase();
  }

  // Filter by payment provider
  if (provider) {
    filter.provider = provider.toLowerCase();
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  // Amount range filter
  if (minAmount || maxAmount) {
    filter.finalPrice = {};
    if (minAmount) {
      filter.finalPrice.$gte = parseFloat(minAmount);
    }
    if (maxAmount) {
      filter.finalPrice.$lte = parseFloat(maxAmount);
    }
  }

  // Direct ID filters
  if (paymentId) {
    filter.paymentId = { $regex: paymentId, $options: "i" };
  }

  if (orderId) {
    filter.orderId = { $regex: orderId, $options: "i" };
  }

  // Search across multiple fields
  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { paymentId: { $regex: search, $options: "i" } },
      { planName: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
};

// -------------------------------------------------------------
// ADMIN CONTROLLERS
// -------------------------------------------------------------

/**
 * @description Get all subscription transactions with filtering (Admin Only)
 * @route POST /api/admin/subscription-transactions/list
 * @access Admin
 */
const getAllSubscriptionTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
    userId,
    planId,
    planKey,
    status,
    provider,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    paymentId,
    orderId,
  } = req.body;

  // Build filter
  const filter = buildTransactionFilter({
    userId,
    planId,
    planKey,
    status,
    provider,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    paymentId,
    orderId,
  });

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Sorting configuration
  const sort = {};
  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "finalPrice",
    "basePrice",
    "durationInDays",
    "walletUsed",
    "payableAmount",
  ];

  if (allowedSortFields.includes(sortBy)) {
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1; // Default sort
  }

  // Execute query with population
  const transactions = await SubscriptionTransaction.find(filter)
    .populate({
      path: "userId",
      select: "name email phone avatar _id",
    })
    .populate({
      path: "planId",
      select: "name description key price durationInDays isActive",
    })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Sanitize transactions
  const sanitizedTransactions = transactions.map((transaction) =>
    sanitizeTransaction(transaction)
  );

  // Get total count for pagination
  const total = await SubscriptionTransaction.countDocuments(filter);

  // Build pagination info
  const pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / limit),
    hasMore: total > skip + transactions.length,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions: sanitizedTransactions,
        pagination,
        filters: {
          applied: Object.keys(filter).length > 0,
          ...(userId && { userId }),
          ...(status && { status }),
          ...(planKey && { planKey }),
        },
      },
      "Subscription transactions fetched successfully"
    )
  );
});

/**
 * @description Get single transaction by ID (Admin Detailed View)
 * @route POST /api/admin/subscription-transactions/details
 * @access Admin
 */
const getSubscriptionTransactionById = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    throw new ApiError(400, "Transaction ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw new ApiError(400, "Invalid transaction ID format");
  }

  const transaction = await SubscriptionTransaction.findById(transactionId)
    .populate({
      path: "userId",
      select: "name email phone avatar createdAt lastLogin subscriptionStatus",
    })
    .populate({
      path: "planId",
      select:
        "name description key price durationInDays features isActive createdAt",
    });

  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  // Format detailed response
  const detailedTransaction = {
    id: transaction._id,
    orderId: transaction.orderId,
    paymentId: transaction.paymentId,
    signature: transaction.signature,
    status: transaction.status,
    failureReason: transaction.failureReason,
    provider: transaction.provider,

    user: transaction.userId
      ? {
          id: transaction.userId._id,
          name: transaction.userId.name,
          email: transaction.userId.email,
          phone: transaction.userId.phone,
          joined: transaction.userId.createdAt,
          lastLogin: transaction.userId.lastLogin,
          subscriptionStatus: transaction.userId.subscriptionStatus,
        }
      : null,

    plan: {
      current: transaction.planId
        ? {
            id: transaction.planId._id,
            name: transaction.planId.name,
            key: transaction.planId.key,
            price: transaction.planId.price,
            duration: transaction.planId.durationInDays,
            features: transaction.planId.features,
            isActive: transaction.planId.isActive,
          }
        : null,
      atPurchase: {
        name: transaction.planName,
        key: transaction.planKey,
        durationInDays: transaction.durationInDays,
      },
    },

    financials: {
      basePrice: transaction.basePrice,
      discountPercent: transaction.discountPercent,
      discountAmount:
        transaction.basePrice * (transaction.discountPercent / 100),
      finalPrice: transaction.finalPrice,
      walletUsed: transaction.walletUsed,
      payableAmount: transaction.payableAmount,
      netAmount: transaction.finalPrice - transaction.walletUsed,
    },

    timeline: {
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    },

    metadata: {
      isDiscounted: transaction.discountPercent > 0,
      usedWallet: transaction.walletUsed > 0,
      isHybridPayment:
        transaction.walletUsed > 0 && transaction.payableAmount > 0,
    },
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        detailedTransaction,
        "Transaction details fetched successfully"
      )
    );
});

/**
 * @description Update transaction status (Admin Only)
 * @route POST /api/admin/subscription-transactions/update-status
 * @access Admin
 */
const updateTransactionStatus = asyncHandler(async (req, res) => {
  const { transactionId, status, failureReason } = req.body;

  if (!transactionId) {
    throw new ApiError(400, "Transaction ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw new ApiError(400, "Invalid transaction ID format");
  }

  // Validate status
  const validStatuses = ["PENDING", "SUCCESS", "FAILED"];
  if (status && !validStatuses.includes(status.toUpperCase())) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Prepare update object
  const updateData = {};
  if (status) updateData.status = status.toUpperCase();
  if (failureReason !== undefined) updateData.failureReason = failureReason;

  // Find and update transaction
  const transaction = await SubscriptionTransaction.findByIdAndUpdate(
    transactionId,
    updateData,
    { new: true, runValidators: true }
  ).populate("userId", "name email");

  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  // Log the admin action
  console.log(
    `Admin ${req.admin?.id || "system"} updated transaction ${transactionId} status to ${status}`
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: transaction._id,
        orderId: transaction.orderId,
        status: transaction.status,
        failureReason: transaction.failureReason,
        updatedAt: transaction.updatedAt,
        user: transaction.userId
          ? {
              name: transaction.userId.name,
              email: transaction.userId.email,
            }
          : null,
      },
      "Transaction status updated successfully"
    )
  );
});

/**
 * @description Delete transaction (Admin Only - Use with caution)
 * @route POST /api/admin/subscription-transactions/delete
 * @access Admin
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    throw new ApiError(400, "Transaction ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw new ApiError(400, "Invalid transaction ID format");
  }

  // Check if transaction exists
  const transaction = await SubscriptionTransaction.findById(transactionId);
  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  // Prevent deletion of successful transactions (safety check)
  if (transaction.status === "SUCCESS") {
    throw new ApiError(
      400,
      "Cannot delete successful transactions. Consider archiving instead."
    );
  }

  // Perform deletion
  await SubscriptionTransaction.findByIdAndDelete(transactionId);

  // Log the deletion
  console.log(
    `Admin ${req.admin?.id || "system"} deleted transaction ${transactionId}`
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: transaction._id,
        orderId: transaction.orderId,
        status: transaction.status,
        amount: transaction.finalPrice,
        deletedAt: new Date(),
      },
      "Transaction deleted successfully"
    )
  );
});

/**
 * @description Get transaction statistics for admin dashboard
 * @route POST /api/admin/subscription-transactions/dashboard-stats
 * @access Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const { period = "month" } = req.body;

  let dateFilter = {};

  // Set date range based on period
  const now = new Date();
  switch (period) {
    case "day":
      dateFilter = {
        createdAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        },
      };
      break;
    case "week":
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: weekStart } };
      break;
    case "month":
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: monthStart } };
      break;
    case "year":
      const yearStart = new Date(now.getFullYear(), 0, 1);
      dateFilter = { createdAt: { $gte: yearStart } };
      break;
  }

  const stats = await SubscriptionTransaction.aggregate([
    { $match: dateFilter },
    {
      $facet: {
        // Overall statistics
        summary: [
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalRevenue: { $sum: "$finalPrice" },
              totalWalletUsed: { $sum: "$walletUsed" },
              totalPGAmount: { $sum: "$payableAmount" },
              avgTransactionValue: { $avg: "$finalPrice" },
            },
          },
        ],
        // Status breakdown
        byStatus: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$finalPrice" },
              avgAmount: { $avg: "$finalPrice" },
            },
          },
        ],
        // Plan breakdown
        byPlan: [
          {
            $group: {
              _id: "$planKey",
              planName: { $first: "$planName" },
              count: { $sum: 1 },
              revenue: { $sum: "$finalPrice" },
              avgDuration: { $avg: "$durationInDays" },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ],
        // Daily trend for chart
        dailyTrend: [
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              count: { $sum: 1 },
              revenue: { $sum: "$finalPrice" },
            },
          },
          { $sort: { "_id.date": 1 } },
          { $limit: 30 },
        ],
      },
    },
  ]);

  // Format the response
  const result = {
    period,
    summary: stats[0].summary[0] || {
      totalTransactions: 0,
      totalRevenue: 0,
      totalWalletUsed: 0,
      totalPGAmount: 0,
      avgTransactionValue: 0,
    },
    statusBreakdown: stats[0].byStatus,
    popularPlans: stats[0].byPlan,
    dailyTrend: stats[0].dailyTrend,
  };

  // Round off decimal values
  if (result.summary.totalRevenue) {
    result.summary.totalRevenue =
      Math.round(result.summary.totalRevenue * 100) / 100;
    result.summary.avgTransactionValue =
      Math.round(result.summary.avgTransactionValue * 100) / 100;
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, result, "Dashboard statistics fetched successfully")
    );
});

/**
 * @description Get revenue analytics
 * @route POST /api/admin/subscription-transactions/revenue-analytics
 * @access Admin
 */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { groupBy = "month", year = new Date().getFullYear() } = req.body;

  // First, create the date format based on groupBy
  let dateFormat;
  let groupId;

  switch (groupBy) {
    case "day":
      dateFormat = "%Y-%m-%d";
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    case "week":
      dateFormat = "%Y-W%U";
      groupId = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
      break;
    case "month":
    default:
      dateFormat = "%Y-%m";
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
      break;
  }

  const analytics = await SubscriptionTransaction.aggregate([
    {
      $match: {
        status: "SUCCESS",
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: "$finalPrice" },
        transactions: { $sum: 1 },
        walletRevenue: { $sum: "$walletUsed" },
        pgRevenue: { $sum: "$payableAmount" },
        avgOrderValue: { $avg: "$finalPrice" },
      },
    },
    {
      $addFields: {
        period: {
          $dateToString: {
            format: dateFormat,
            date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: "$_id.day",
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        period: {
          $cond: {
            if: { $eq: [groupBy, "week"] },
            then: {
              $concat: [
                { $toString: "$_id.year" },
                "-W",
                {
                  $toString: {
                    $cond: {
                      if: { $lt: ["$_id.week", 10] },
                      then: { $concat: ["0", { $toString: "$_id.week" }] },
                      else: "$_id.week",
                    },
                  },
                },
              ],
            },
            else: "$period",
          },
        },
        revenue: { $round: ["$revenue", 2] },
        transactions: 1,
        walletRevenue: { $round: ["$walletRevenue", 2] },
        pgRevenue: { $round: ["$pgRevenue", 2] },
        avgOrderValue: { $round: ["$avgOrderValue", 2] },
      },
    },
    { $sort: { period: 1 } },
  ]);

  // Calculate totals
  const totals = analytics.reduce(
    (acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.revenue,
      totalTransactions: acc.totalTransactions + curr.transactions,
      totalWalletRevenue: acc.totalWalletRevenue + curr.walletRevenue,
      totalPGRevenue: acc.totalPGRevenue + curr.pgRevenue,
    }),
    {
      totalRevenue: 0,
      totalTransactions: 0,
      totalWalletRevenue: 0,
      totalPGRevenue: 0,
    }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        period: groupBy,
        year,
        analytics,
        totals: {
          ...totals,
          walletPercentage:
            totals.totalRevenue > 0
              ? Math.round(
                  (totals.totalWalletRevenue / totals.totalRevenue) * 100
                )
              : 0,
          pgPercentage:
            totals.totalRevenue > 0
              ? Math.round((totals.totalPGRevenue / totals.totalRevenue) * 100)
              : 0,
        },
      },
      "Revenue analytics fetched successfully"
    )
  );
});

/**
 * @description Export transactions as CSV
 * @route POST /api/admin/subscription-transactions/export
 * @access Admin
 */
const exportTransactions = asyncHandler(async (req, res) => {
  const { format = "csv", startDate, endDate, status } = req.body;

  // Build filter
  const filter = buildTransactionFilter({ startDate, endDate, status });

  // Get transactions with user data
  const transactions = await SubscriptionTransaction.find(filter)
    .populate("userId", "name email phone")
    .populate("planId", "name key")
    .sort({ createdAt: -1 });

  // Format data for export
  const exportData = transactions.map((t) => ({
    "Transaction ID": t._id,
    "Order ID": t.orderId,
    "Payment ID": t.paymentId || "N/A",
    Status: t.status,
    Date: t.createdAt.toISOString(),
    "User ID": t.userId?._id || "N/A",
    "User Name": t.userId?.name || "N/A",
    "User Email": t.userId?.email || "N/A",
    "Plan ID": t.planId?._id || "N/A",
    "Plan Name": t.planName,
    "Plan Key": t.planKey,
    "Duration (Days)": t.durationInDays,
    "Base Price": t.basePrice,
    "Discount %": t.discountPercent,
    "Discount Amount": (t.basePrice * t.discountPercent) / 100,
    "Final Price": t.finalPrice,
    "Wallet Used": t.walletUsed,
    "PG Amount": t.payableAmount,
    "Payment Provider": t.provider,
    "Failure Reason": t.failureReason || "N/A",
  }));

  if (format === "csv") {
    // Convert to CSV
    const headers = Object.keys(exportData[0] || {}).join(",");
    const rows = exportData.map((row) =>
      Object.values(row)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions_${new Date().toISOString().split("T")[0]}.csv`
    );
    res.send(csv);
  } else {
    // Return JSON for other formats
    res.status(200).json(
      new ApiResponse(
        200,
        {
          data: exportData,
          count: exportData.length,
          exportedAt: new Date(),
        },
        "Transactions exported successfully"
      )
    );
  }
});

/**
 * @description Get failed transactions analysis
 * @route POST /api/admin/subscription-transactions/failed-analysis
 * @access Admin
 */
const getFailedTransactionsAnalysis = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.body;

  const failedTransactions = await SubscriptionTransaction.find({
    status: "FAILED",
  })
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Analyze failure reasons
  const failureAnalysis = failedTransactions.reduce((acc, transaction) => {
    const reason = transaction.failureReason || "Unknown";
    if (!acc[reason]) {
      acc[reason] = { count: 0, totalAmount: 0, transactions: [] };
    }
    acc[reason].count++;
    acc[reason].totalAmount += transaction.finalPrice;
    acc[reason].transactions.push({
      id: transaction._id,
      orderId: transaction.orderId,
      amount: transaction.finalPrice,
      date: transaction.createdAt,
      user: transaction.userId?.email,
    });
    return acc;
  }, {});

  // Convert to array and sort by count
  const failureBreakdown = Object.entries(failureAnalysis)
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      totalAmount: data.totalAmount,
      percentage: (data.count / failedTransactions.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalFailed: failedTransactions.length,
        failureBreakdown,
        recentFailures: failedTransactions.slice(0, 20).map((t) => ({
          id: t._id,
          orderId: t.orderId,
          amount: t.finalPrice,
          reason: t.failureReason,
          date: t.createdAt,
          user: t.userId
            ? { name: t.userId.name, email: t.userId.email }
            : null,
        })),
      },
      "Failed transactions analysis fetched successfully"
    )
  );
});

// -------------------------------------------------------------
// EXPORT ALL CONTROLLERS
// -------------------------------------------------------------

export {
  getAllSubscriptionTransactions,
  getSubscriptionTransactionById,
  updateTransactionStatus,
  deleteTransaction,
  getDashboardStats,
  getRevenueAnalytics,
  exportTransactions,
  getFailedTransactionsAnalysis,
};
