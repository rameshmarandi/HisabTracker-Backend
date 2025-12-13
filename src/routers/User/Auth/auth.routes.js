import { Router } from "express";

// import circuitBreakerMiddleware from "../middlewares/circuitBreakerMiddleware.js";
import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
// import { verifyUserJWT } from "../middlewares/auth.middleware.js";
import {
  verifyDeviceAccess,
  verifyUserJWT,
} from "../../../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  updateDeviceInfo,
  getCurrentUser,
  logoutUser,
  removeDevice,
  refreshAccessToken,
  getUserSubscriptionStatus,
} from "../../../controllers/User/Auth/user.controller.js";
import { validateRequest } from "../../../middlewares/validation.middleware.js";
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  removeDeviceSchema,
} from "../../../validators/auth.validator.js";
import { updateDeviceInfoSchema } from "../../../validators/device.validator.js";
// import { loginRateLimiter } from "../services/rateLimiter.js"; // (optional)

const router = Router();

// -------------------------------------------------------------
// AUTH ROUTES — HISABTRACKER
// -------------------------------------------------------------

// ------------------------------------------
// REGISTER USER
// ------------------------------------------
router.post(
  "/registration",
  // loginRateLimiter,        // Optional rate limiter
  validateRequest(registerSchema),
  circuitBreakerMiddleware(registerUser)
);

// ------------------------------------------
// LOGIN USER
// ------------------------------------------
router.post(
  "/login",
  validateRequest(loginSchema),
  // loginRateLimiter,
  circuitBreakerMiddleware(loginUser)
);
router.post(
  "/removeDevice",
  // loginRateLimiter,
  validateRequest(removeDeviceSchema),
  circuitBreakerMiddleware(removeDevice)
);

// ------------------------------------------
// GET CURRENT USER (AUTH REQUIRED)
// ------------------------------------------
router.get(
  "/myProfile",
  verifyUserJWT,
  verifyDeviceAccess,
  circuitBreakerMiddleware(getCurrentUser)
);
router.get(
  "/subscriptionStatus",
  verifyUserJWT,
  // verifyDeviceAccess,
  circuitBreakerMiddleware(getUserSubscriptionStatus)
);

// ------------------------------------------
// LOGOUT USER
// ------------------------------------------
router.post(
  "/logout",
  verifyUserJWT,
  // verifyDeviceAccess,
  validateRequest(logoutSchema),
  circuitBreakerMiddleware(logoutUser)
);
router.post(
  "/getRefreshToken",
  validateRequest(refreshTokenSchema),
  circuitBreakerMiddleware(refreshAccessToken)
);

// ------------------------------------------
// UPDATE DEVICE INFO (FCM + device meta)
// ------------------------------------------
router.post(
  "/updateDeviceInfo",
  verifyUserJWT,
  validateRequest(updateDeviceInfoSchema),
  circuitBreakerMiddleware(updateDeviceInfo)
);

// -------------------------------------------------------------
// EXPORT ROUTER
// -------------------------------------------------------------
export default router;
