import { ApiError } from "../utils/ApiError.js";

export const syncAccessGuard = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new ApiError(401, "Authentication required for sync"));
  }

  if (process.env.SYNC_ENABLED === "false") {
    return next(new ApiError(503, "Sync temporarily disabled"));
  }

  if (process.env.SYNC_PREMIUM_ONLY === "true") {
    const isPremiumActive =
      user.isPremium &&
      user.premiumExpiresAt &&
      user.premiumExpiresAt > new Date();
    if (!isPremiumActive) {
      return next(
        new ApiError(403, "Sync is available only for active premium users")
      );
    }
  }

  next();
};
