import express from "express";

// import { verifyUserJWT } from "../middlewares/auth.middleware.js";

import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "../../../controllers/User/Subscriptions/subscriptionPurchase.controller.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/order/create", verifyUserJWT, createSubscriptionOrder);
router.post("/order/verify", verifyUserJWT, verifySubscriptionPayment);

export default router;
