// services/responseMapper.js

import moment from "moment";

export const mapUserResponse = (user, options = { includeTokens: false }) => {
  if (!user) return null;

  // Convert Mongoose doc to plain object if necessary
  const plainUser =
    typeof user.toObject === "function" ? user.toObject() : user;

  const {
    accessToken,
    refreshToken,
    wallet = {},
    subscription = {},
    devices = [],
    ...rest
  } = plainUser;

  //  Subscription Formatting
  const formattedSubscription = {
    isPremium: subscription?.isPremium || false,
    planKey: subscription?.planKey || null,
    planName: subscription?.planName || null,
    startedAt: subscription?.startedAt || null,
    expiresAt: subscription?.expiresAt || null,
    isExpired:
      subscription?.expiresAt &&
      moment(subscription.expiresAt).isBefore(moment()),
    daysRemaining:
      subscription?.expiresAt &&
      moment(subscription.expiresAt).diff(moment(), "days") > 0
        ? moment(subscription.expiresAt).diff(moment(), "days")
        : 0,
    features: subscription?.features || {},
    maxDevicesAllowed: subscription?.maxDevicesAllowed || 1,
    syncAllowed: subscription?.syncAllowed ?? false,
    status:
      subscription?.expiresAt &&
      moment(subscription.expiresAt).isBefore(moment())
        ? "inactive"
        : "active",
    source: subscription?.source || null,
    walletBalance: wallet?.balance || 0,
  };

  // Wallet Formatting
  const formattedWallet = {
    balance: wallet?.balance || 0,
    totalEarnedCash: wallet?.totalEarnedCash || 0,
  };

  // User Formatting (excluding sensitive fields)
  const formattedUser = {
    ...rest,
    devices,
    wallet: formattedWallet,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  // Build Final Data Response
  const responseData = {
    user: formattedUser,
    subscription: formattedSubscription,
    wallet: formattedWallet,
  };

  // Include tokens only if required
  if (options.includeTokens && accessToken && refreshToken) {
    responseData.accessToken = accessToken;
    responseData.refreshToken = refreshToken;
  }

  return responseData;
};
