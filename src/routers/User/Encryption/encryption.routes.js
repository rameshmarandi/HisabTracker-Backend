import { Router } from "express";

import circuitBreakerMiddleware from "../../../middlewares/circuitBreakerMiddleware.js";

import {
  decryptionHandler,
  encryptionHandler,
} from "../../../controllers/User/Encryption/encryption.controller.js";

const router = Router();

router.route("/encrypt").post(circuitBreakerMiddleware(encryptionHandler));
router.route("/decrypt").post(circuitBreakerMiddleware(decryptionHandler));

export default router;
