// schedulerManager.js

import cron from "node-cron";
import { User } from "../models/User/Auth/user.model.js";
import { AppConfig } from "../models/Admin/AppConfig/appConfig.model.js";

import { SubscriptionPlan } from "../models/Admin/Subscription/subscriptionPlan.model.js";

// Cron Manager
class SchedulerManager {
  constructor() {
    this.jobs = {};
  }

  addJob(name, schedule, task) {
    if (this.jobs[name]) {
      this.jobs[name].stop();
    }

    const job = cron.schedule(schedule, async () => {
      console.log(`\n🚀 Running "${name}" - ${new Date().toLocaleString()}`);

      try {
        await task();
        console.log(`✔ Job "${name}" done`);
      } catch (error) {
        console.error(`❌ ${name} error:`, error.message);
      }
    });

    this.jobs[name] = job;
    console.log(`🕒 Scheduled: ${name} → ${schedule}`);
  }
}

const schedulerManager = new SchedulerManager();

/**
 * 🔥 Helper: get global config safely
 */
const loadAppConfig = async () => {
  const config = await AppConfig.findOne({});
  return config || {};
};

/**
 * 🔥 Helper: build Free subscription object for a user
 * - Prefer Free plan from DB (planKey: "free")
 * - Fallback to AppConfig freeUserLimits
 */
const buildFreeSubscriptionForUser = async (user, config, previousSource) => {
  // Try Free plan from DB
  const freePlan = await SubscriptionPlan.findOne({
    planKey: "free",
    isActive: true,
  }).populate("features.featureId");

  const freeLimits = config?.app?.freeUserLimits ||
    config?.freeUserLimits || {
      maxDevices: 1,
      maxBooks: 1,
      maxCategoriesPerBook: 50,
      maxTransactionsPerMonth: 2000,
    };

  const baseSub = {
    planId: freePlan?._id || null,
    planKey: "free",
    planName: freePlan?.name || "Free Plan",
    isPremium: false,
    startedAt: Date.now(),
    expiresAt: null,
    source:
      previousSource === "trial"
        ? "trial-expired"
        : previousSource === "payment"
          ? "subscription-expired"
          : "downgraded",
  };

  // If Free plan exists in DB → use its features
  if (freePlan) {
    const features = {};
    freePlan.features.forEach((f) => {
      features[f.featureKey] = f.value;
    });

    const deviceFeature = freePlan.features.find(
      (f) => f.featureKey === "multipledevices"
    );

    return {
      ...baseSub,
      features,
      maxDevicesAllowed: deviceFeature?.value ?? freeLimits.maxDevices ?? 1,
    };
  }

  // Fallback: use AppConfig limits
  console.warn(
    "⚠️ Free plan missing — using AppConfig freeUserLimits fallback"
  );

  return {
    ...baseSub,
    features: {
      cloudsync: false,
      multipledevices: freeLimits.maxDevices ?? 1,
      maxbooks: freeLimits.maxBooks ?? 1,
      maxcategoriesperbook: freeLimits.maxCategoriesPerBook ?? 50,
      exportlimit: freeLimits.maxTransactionsPerMonth ?? 2000,
      advancedpdf: false,
      premiumthemes: false,
      prioritysupport: false,
      chatbot: false,
    },
    maxDevicesAllowed: freeLimits.maxDevices ?? 1,
  };
};

/**
 * 🚨 00:01 AM — Auto Expire Premium Subscribers
 * - Downgrade expired premium & trial users → Free plan
 * - Skip if revenue model disabled
 * - Skip VIP / lifetime users (by email list)
 */
schedulerManager.addJob("expireSubscriptions", "1 0 * * *", async () => {
  const config = await loadAppConfig();

  const revenueEnabled = config?.app?.isRevenueModelEnabled !== false;
  if (!revenueEnabled) {
    console.log(
      "🔄 Revenue model disabled — skipping subscription expiry checks"
    );
    return;
  }

  const now = Date.now();

  // VIP emails – lifetime free premium
  const vipEmails =
    config?.app?.lifetimePremiumEmails || config?.lifetimePremiumEmails || []; // array of email strings

  const expiredUsers = await User.find({
    "currentSubscription.isPremium": true,
    "currentSubscription.expiresAt": { $lte: now },
  });

  if (!expiredUsers.length) {
    console.log("✨ No expired subscriptions today");
    return;
  }

  for (const user of expiredUsers) {
    // Skip VIP / lifetime users
    if (vipEmails.includes(user.email?.toLowerCase?.().trim?.())) {
      console.log(
        `⭐ Skipping VIP lifetime user (no downgrade): ${user.email} (${user._id})`
      );
      continue;
    }

    const prevSub = user.currentSubscription || {};

    const newSub = await buildFreeSubscriptionForUser(
      user,
      config,
      prevSub.source
    );

    user.currentSubscription = newSub;
    await user.save();

    console.log(
      `🔻 Downgraded expired user ${user.email} (${user._id}) → Free Plan`
    );
  }
});

/**
 * 🔔 02:00 AM — Reminder Notifications (6, 4 & 1 day before expiry)
 * - Only for premium users with expiry
 * - Skip VIP emails
 */
schedulerManager.addJob(
  "subscriptionExpiryReminders",
  "0 2 * * *", // Every day at 02:00 AM
  async () => {
    const config = await loadAppConfig();

    const revenueEnabled = config?.app?.isRevenueModelEnabled !== false;
    if (!revenueEnabled) {
      console.log(
        "🔄 Revenue model disabled — skipping expiry reminders as well"
      );
      return;
    }

    const vipEmails =
      config?.app?.lifetimePremiumEmails || config?.lifetimePremiumEmails || [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const targetDates = [];
    for (const daysLeft of [6, 4, 1]) {
      const d = new Date(todayStart);
      d.setDate(todayStart.getDate() + daysLeft);
      targetDates.push(d.toISOString().split("T")[0]);
    }

    const users = await User.find({
      "currentSubscription.isPremium": true,
      "currentSubscription.expiresAt": {
        $gte: todayStart.getTime(),
      },
    });

    for (const u of users) {
      // Skip VIP lifetime users from reminders
      if (vipEmails.includes(u.email?.toLowerCase?.().trim?.())) {
        continue;
      }

      const expiryDateISO = new Date(u.currentSubscription.expiresAt)
        .toISOString()
        .split("T")[0];

      if (!targetDates.includes(expiryDateISO)) continue;

      const daysRemaining = Math.ceil(
        (u.currentSubscription.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const message = `⚠️ Your premium will expire in ${daysRemaining} day(s). Renew now to continue premium features!`;

      console.log(`📩 Reminder to ${u.email} (${u._id}) → ${message}`);

      // TODO: Enable once FCM is configured
      // await sendPushNotification(u.firebaseToken, {
      //   title: "Subscription Expiry!",
      //   body: message,
      // });
    }
  }
);

export const startSchedulers = () => {
  console.log("🚀 Subscription Schedulers Started");
};
