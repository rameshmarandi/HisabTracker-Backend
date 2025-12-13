export const formatSubscriptionResponse = (sub, walletBalance = 0) => {
  if (!sub) {
    return {
      isPremium: false,
      planKey: "free",
      planName: "Free",
      startedAt: null,
      expiresAt: null,
      isExpired: false,
      daysRemaining: Infinity,
      features: {},
      maxDevicesAllowed: 1,
      syncAllowed: false,
      status: "active",
      source: "signup",
      walletBalance,
    };
  }

  const now = Date.now();
  const expiresAt = sub.expiresAt ? Number(sub.expiresAt) : null;
  const isExpired = expiresAt ? now > expiresAt : false;

  const daysRemaining = expiresAt
    ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    : Infinity;

  return {
    isPremium: sub.isPremium && !isExpired,
    planKey: sub.planKey,
    planName: sub.planName,
    startedAt: sub.startedAt,
    expiresAt,
    isExpired,
    daysRemaining,
    features: sub.features,
    maxDevicesAllowed: sub.maxDevicesAllowed,
    syncAllowed: !!sub.features?.cloudsync,
    status: isExpired ? "expired" : "active",
    source: sub.source,
    walletBalance,
  };
};
