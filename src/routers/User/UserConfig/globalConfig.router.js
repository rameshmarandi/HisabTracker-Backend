import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";
import { getAllAdConfigs } from "../../../controllers/Admin/AppConfig/adConfig.controller.js";
import { getAppConfig } from "../../../controllers/Admin/AppConfig/appConfig.controller.js";

const router = Router();
router.get(
  "/getAdConfig",

  circuitBreakerMiddleware(getAllAdConfigs)
);
router.get(
  "/getAppConfig",

  circuitBreakerMiddleware(getAppConfig)
);
export default router;
