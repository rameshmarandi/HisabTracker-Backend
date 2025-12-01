import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";

import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";

import { getAllTransactions } from "../../../controllers/User/TransactionsHistory/getAllTransactions.controller.js";

const router = Router();
router.get(
  "/getTransactionHistory",
  verifyUserJWT,
  // loginRateLimiter,        // Optional rate limiter
  //   validateRequest(registerSchema),
  circuitBreakerMiddleware(getAllTransactions)
);

export default router;
