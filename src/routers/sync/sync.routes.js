import { Router } from "express";
import {
  pushChanges,
  pullChanges,
  initialSync,
} from "../../controllers/sync/syncController.js";
import { syncAccessGuard } from "../../middlewares/syncAccess.middleware.js";
import { verifyUserJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * 🔹 Sync Operations
 */

// Push Local Changes → Server
router.post(
  "/push",
  verifyUserJWT,
  //  verifyJWT, syncAccessGuard,
  pushChanges
);

// Pull Server Changes → Local
router.post(
  "/pull",
  verifyUserJWT,
  //  verifyJWT, syncAccessGuard,

  pullChanges
);

// Initial Full Restore on Fresh Login/New Device
router.get(
  "/initial",
  verifyUserJWT,
  //  verifyJWT, syncAccessGuard,
  initialSync
);

export default router;
