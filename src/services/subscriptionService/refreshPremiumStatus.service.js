export const refreshPremiumStatus = async (user) => {
  /**
   * NOTES:
   * - Checks if user's premium expired
   * - If expired → downgrade to free plan
   * - Removes all premium features
   * - Resets max devices to 1
   */

  if (user.isPremium && user.premiumExpiresAt < Date.now()) {
    console.log("Premium expired → Downgrading user");

    user.isPremium = false;
    user.premiumPlanKey = null;
    user.premiumStartedAt = null;
    user.premiumExpiresAt = null;

    user.featureAccess = {
      cloudSync: false,
      multiDevice: false,
      premiumThemes: false,
      advancedPdf: false,
    };

    user.maxDevicesAllowed = 1;
    await user.save();
  }

  return user;
};
