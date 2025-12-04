import express from "express";

// import { verifyUserJWT } from "../middlewares/auth.middleware.js";

import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "../../../controllers/User/Subscriptions/subscriptionPurchase.controller.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import { getAllSubscriptionPlans } from "../../../controllers/Admin/SubscriptionPlan/subscriptionPlan.controller.js";
const router = express.Router();

router.post("/order/create", verifyUserJWT, createSubscriptionOrder);
router.post("/order/verify", verifyUserJWT, verifySubscriptionPayment);
router.get("/getAllPlans", verifyUserJWT, getAllSubscriptionPlans);

export default router;
