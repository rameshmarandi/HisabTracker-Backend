import { Router } from "express";
// import { verifyUserJWT } from "../../middlewares/auth.middleware.js";

// import { circuitBreakerMiddleware } from "../../middlewares/circuitBreaker.middleware.js";

import {
  getAppConfig,
  createAppConfig,
  updateAppConfig,
  resetAppConfig,
} from "../../../controllers/Admin/AppConfig/appConfig.controller.js";
import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";

const router = Router();

// -------------------------------------------------------------
// ADMIN ROUTES — APP CONFIGURATION MANAGEMENT
// -------------------------------------------------------------

// GET CURRENT APP CONFIG
router.get(
  "/",
  //   verifyUserJWT,
  // verifyAdminRole, // 👈 will be enabled later
  circuitBreakerMiddleware(getAppConfig)
);

// CREATE NEW APP CONFIG (only first time)
router.post(
  "/create",
  //   verifyUserJWT,
  // verifyAdminRole,
  circuitBreakerMiddleware(createAppConfig)
);

// UPDATE EXISTING CONFIG (partial update allowed)
router.patch(
  "/update",
  //   verifyUserJWT,
  // verifyAdminRole,
  circuitBreakerMiddleware(updateAppConfig)
);

// RESET APP CONFIG TO DEFAULT VALUES
router.post(
  "/reset",
  //   verifyUserJWT,
  // verifyAdminRole,
  circuitBreakerMiddleware(resetAppConfig)
);

// -------------------------------------------------------------
// EXPORT ROUTER
// -------------------------------------------------------------
export default router;
