// src/routes/Admin/adminAdConfig.routes.js
import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import {
  getReferralSettings,
  updateReferralSetting,
} from "../../../controllers/Admin/BusinessSetting/businessSetting.controller.js";

const router = Router();

// Later add verifyAdmin middleware as well

router.get(
  "/getBusinessSetting",
  //  verifyUserJWT,

  circuitBreakerMiddleware(getReferralSettings)
);

router.patch(
  "/updateBusinessSetting",
  //   verifyUserJWT,
  circuitBreakerMiddleware(updateReferralSetting)
);

export default router;
