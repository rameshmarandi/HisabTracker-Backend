// src/routes/Admin/feature.routes.js
import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import {
  createFeature,
  getAllFeatures,
  updateFeature,
  toggleFeatureStatus,
  deleteFeature,
} from "../../../controllers/Admin/Features/feature.controller.js";
// createFeature, getAllFeatures, updateFeature, toggleFeatureStatus

const router = Router();

// Later add verifyAdmin middleware as well

router.post(
  "/createFeature",
  //  verifyUserJWT,

  circuitBreakerMiddleware(createFeature)
);
router.get(
  "/getAllFeatures",
  //  verifyUserJWT,

  circuitBreakerMiddleware(getAllFeatures)
);

router.patch(
  "/updateFeature",
  //   verifyUserJWT,
  circuitBreakerMiddleware(updateFeature)
);
router.post(
  "/deleteFeature",
  //   verifyUserJWT,
  circuitBreakerMiddleware(deleteFeature)
);
router.post(
  "/toggleFeatureStatus",
  //   verifyUserJWT,
  circuitBreakerMiddleware(toggleFeatureStatus)
);
export default router;
