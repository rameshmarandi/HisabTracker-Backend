// import { Router } from "express";

// import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";

// import {
//   adminRateLimiter,
//   loginRateLimiter,
// } from "../../../services/rateLimiter.js";
// import {
//   verifyAdminJWT,
//   authAdminOrSuperAdmin,
// } from "../../../middlewares/auth.middleware.js";
// import {
//   getAdminSettings,
//   getTotalFreeCoinsGenerated,
//   manageDefaultsCoins,
// } from "../../../controllers/Admin/AdminSetting/adminSettings.controller.js";

// const router = Router();
// router
//   .route("/addCoins")
//   .post(
//     adminRateLimiter,
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(manageDefaultsCoins)
//   );

// router
//   .route("/totalFreeCoins")
//   .post(
//     adminRateLimiter,
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(getTotalFreeCoinsGenerated)
//   );
// router
//   .route("/getAdminSettings")
//   .get(
//     adminRateLimiter,
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(getAdminSettings)
//   );

// export default router;
