import cron from "node-cron";
import { User } from "../models/User/Auth/user.model.js";
import { AppConfig } from "../models/Admin/AppConfig/appConfig.model.js";

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

// 🚨 00:01 AM — Auto Expire Premium Subscribers
schedulerManager.addJob("expireSubscriptions", "1 0 * * *", async () => {
  const now = Date.now();
  const config = await AppConfig.findOne({ key: "default" });
  const free = config?.freeUserLimits || { maxDevices: 1 };

  const expiredUsers = await User.find({
    "currentSubscription.isPremium": true,
    "currentSubscription.expiresAt": { $lte: now },
  });

  for (const user of expiredUsers) {
    user.currentSubscription.isPremium = false;
    user.currentSubscription.planId = null;
    user.currentSubscription.planName = "Free Plan";
    user.currentSubscription.features = {};
    user.currentSubscription.maxDevicesAllowed = free.maxDevices ?? 1;

    await user.save();

    console.log(`🔻 Downgraded premium user: ${user._id}`);
  }
});

// 🔔 10:00 AM — Reminder Notifications (6, 4 & 1 day before expiry)
schedulerManager.addJob(
  "subscriptionExpiryReminders",
  // "0 10 * * *",

  "0 2 * * *", // ⏰ Every day at 02:00 AM
  async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString().split("T")[0];

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
      const expiryDateISO = new Date(u.currentSubscription.expiresAt)
        .toISOString()
        .split("T")[0];

      if (!targetDates.includes(expiryDateISO)) continue;

      const daysRemaining = Math.ceil(
        (u.currentSubscription.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const message = `⚠️ Your premium will expire in ${daysRemaining} day(s). Renew now to continue premium features!`;

      console.log(`📩 Reminder to ${u._id} → ${message}`);

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
