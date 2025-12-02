// src/routes/Admin/adminAdConfig.routes.js
import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  deleteSubscriptionPlan,
} from "../../../controllers/Admin/SubscriptionPlan/subscriptionPlan.controller.js";

const router = Router();

// Later add verifyAdmin middleware as well

router.post(
  "/createSubscriptionPlan",
  //  verifyUserJWT,

  circuitBreakerMiddleware(createSubscriptionPlan)
);
router.get(
  "/getAllSubscriptionPlans",
  //  verifyUserJWT,

  circuitBreakerMiddleware(getAllSubscriptionPlans)
);

router.patch(
  "/updateSubscriptionPlan",
  //   verifyUserJWT,
  circuitBreakerMiddleware(updateSubscriptionPlan)
);
router.post(
  "/toggleSubscriptionPlanStatus",
  //   verifyUserJWT,
  circuitBreakerMiddleware(toggleSubscriptionPlanStatus)
);
router.post(
  "/deleteSubscriptionPlan",
  //   verifyUserJWT,
  circuitBreakerMiddleware(deleteSubscriptionPlan)
);
export default router;
