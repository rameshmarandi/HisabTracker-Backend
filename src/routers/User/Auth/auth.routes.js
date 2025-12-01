import { Router } from "express";

// import circuitBreakerMiddleware from "../middlewares/circuitBreakerMiddleware.js";
import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
// import { verifyUserJWT } from "../middlewares/auth.middleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  updateDeviceInfo,
  getCurrentUser,
  logoutUser,
  removeDevice,
} from "../../../controllers/User/Auth/user.controller.js";
import { validateRequest } from "../../../middlewares/validation.middleware.js";
import {
  loginSchema,
  logoutSchema,
  registerSchema,
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
  circuitBreakerMiddleware(removeDevice)
);

// ------------------------------------------
// GET CURRENT USER (AUTH REQUIRED)
// ------------------------------------------
router.get(
  "/myProfile",
  verifyUserJWT,
  circuitBreakerMiddleware(getCurrentUser)
);

// ------------------------------------------
// LOGOUT USER
// ------------------------------------------
router.post(
  "/logout",
  verifyUserJWT,
  validateRequest(logoutSchema),
  circuitBreakerMiddleware(logoutUser)
);

// ------------------------------------------
// UPDATE DEVICE INFO (FCM + device meta)
// ------------------------------------------
router.post(
  "/update-device-info",
  verifyUserJWT,
  validateRequest(updateDeviceInfoSchema),
  circuitBreakerMiddleware(updateDeviceInfo)
);

// -------------------------------------------------------------
// EXPORT ROUTER
// -------------------------------------------------------------
export default router;
