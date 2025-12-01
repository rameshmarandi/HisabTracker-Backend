// src/routes/Admin/adminAdConfig.routes.js
import { Router } from "express";
// import { verifyUserJWT } from "../../middlewares/auth.middleware.js";
// import { circuitBreakerMiddleware } from "../../middlewares/circuitBreaker.middleware.js";
// import {
//   getAllAdConfigs,
//   createAdConfig,
//   updateAdConfig,
//   deleteAdConfig,
// } from "../../controllers/adminAdConfig.controller.js";

// import {
//   getAppConfig,
//   createAppConfig,
//   updateAppConfig,
//   resetAppConfig,
// } from "../../../controllers/Admin/AppConfig/appConfig.controller.js";
import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { verifyUserJWT } from "../../../middlewares/auth.middleware.js";
import {
  getAllAdConfigs,
  createAdConfig,
  updateAdConfig,
  deleteAdConfig,
} from "../../../controllers/Admin/AppConfig/adConfig.controller.js";

const router = Router();

// Later add verifyAdmin middleware as well

router.get(
  "/getAdConfig",
  //  verifyUserJWT,

  circuitBreakerMiddleware(getAllAdConfigs)
);
router.post(
  "/create",
  // verifyUserJWT,

  circuitBreakerMiddleware(createAdConfig)
);
router.patch(
  "/update",
  //   verifyUserJWT,
  circuitBreakerMiddleware(updateAdConfig)
);
router.delete(
  "/delete",
  //   verifyUserJWT,
  circuitBreakerMiddleware(deleteAdConfig)
);

export default router;
