// src/routes/Admin/adminSubscriptionTransactions.routes.js
import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import {
  getAllSubscriptionTransactions,
  getSubscriptionTransactionById,
  updateTransactionStatus,
  deleteTransaction,
  getDashboardStats,
  getRevenueAnalytics,
  exportTransactions,
  getFailedTransactionsAnalysis,
} from "../../../controllers/Admin/Dashboard/dashboard.controller.js";

// import {
//   getAllSubscriptionTransactions,
//   getSubscriptionTransactionById,
//   updateTransactionStatus,
//   deleteTransaction,
//   getDashboardStats,
//   getRevenueAnalytics,
//   exportTransactions,
//   getFailedTransactionsAnalysis,
// } from "../../../controllers/Admin/SubscriptionTransaction/subscriptionTransaction.admin.controller.js";

const router = Router();

// Transaction management routes
router.get(
  "/getAllSubscriptionTransactions",
  // verifyUserJWT, // Add admin verification later
  circuitBreakerMiddleware(getAllSubscriptionTransactions)
);

router.post(
  "/getSubscriptionTransactionById",
  // verifyUserJWT,
  circuitBreakerMiddleware(getSubscriptionTransactionById)
);

router.post(
  "/updateTransactionStatus",
  // verifyUserJWT,
  circuitBreakerMiddleware(updateTransactionStatus)
);

router.post(
  "/deleteTransaction",
  // verifyUserJWT,
  circuitBreakerMiddleware(deleteTransaction)
);

// Analytics & Dashboard routes
router.get(
  "/getDashboardStats",
  // verifyUserJWT,
  circuitBreakerMiddleware(getDashboardStats)
);

router.post(
  "/getRevenueAnalytics",
  // verifyUserJWT,
  circuitBreakerMiddleware(getRevenueAnalytics)
);

router.post(
  "/getFailedTransactionsAnalysis",
  // verifyUserJWT,
  circuitBreakerMiddleware(getFailedTransactionsAnalysis)
);

// Data export route
router.post(
  "/exportTransactions",
  // verifyUserJWT,
  circuitBreakerMiddleware(exportTransactions)
);

export default router;
