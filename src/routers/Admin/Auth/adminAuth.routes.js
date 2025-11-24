// import { Router } from "express";

// import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
// // import {
// //   getAllDeletedAccount,
// //   deleteMobileNumberFromDeletedAccount,
// //   setMPIN,
// //   verifyMPIN,
// //   adminLogin,
// //   changeAdminPassword,
// //   adminLogoutHandler,
// // } from "../../controllers/Admin/adminAuth.controller.js";
// adminLogoutHandler;
// import { loginRateLimiter } from "../../../services/rateLimiter.js";
// import {
//   verifyAdminJWT,
//   authAdminOrSuperAdmin,
// } from "../../../middlewares/auth.middleware.js";
// import {
//   getAllDeletedAccount,
//   deleteMobileNumberFromDeletedAccount,
//   setMPIN,
//   verifyMPIN,
//   adminLogin,
//   changeAdminPassword,
//   adminLogoutHandler,
//   verifyAdminID,
//   updateDeviceInfoAndLoginHistory,
//   getLoginHistory,
// } from "../../../controllers/Admin/Auth/adminAuth.controller.js";

// const router = Router();
// router
//   .route("/getAllDeletedAccount")
//   .post(
//     loginRateLimiter,
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(getAllDeletedAccount)
//   ); // super admin & admin
// router.route("/verifyAdminID").post(
//   // loginRateLimiter,
//   circuitBreakerMiddleware(verifyAdminID)
// );
// router.route("/adminLogin").post(
//   // loginRateLimiter,
//   circuitBreakerMiddleware(adminLogin)
// );
// router.route("/setMPIN").post(circuitBreakerMiddleware(setMPIN));
// router.route("/changeAdminPassword").post(
//   // loginRateLimiter,
//   verifyAdminJWT,
//   authAdminOrSuperAdmin,
//   circuitBreakerMiddleware(changeAdminPassword)
// );
// router.route("/verifyMPIN").post(circuitBreakerMiddleware(verifyMPIN));
// router
//   .route("/adminLogout")
//   .post(verifyAdminJWT, circuitBreakerMiddleware(adminLogoutHandler));
// router
//   .route("/removeMobileNumber")
//   .post(
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(deleteMobileNumberFromDeletedAccount)
//   );
// router
//   .route("/updateDeviceInfo")
//   .post(
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(updateDeviceInfoAndLoginHistory)
//   );
// router
//   .route("/getLoginHistory")
//   .get(
//     verifyAdminJWT,
//     authAdminOrSuperAdmin,
//     circuitBreakerMiddleware(getLoginHistory)
//   );

// export default router;
