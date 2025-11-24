import cron from "node-cron";

// import { sendEmailTemplate } from "./sendEmailTemplate.js";
// import {
//   syncOnlineStatusToDB,
//   syncRedisToMongoDB,
// } from "../services/syncRedisToMongoDB.js";
// import { subscriptionExpiryJob } from "../controllers/User/ProFinderSubscription/profinderSubscription.controller.js";

// SchedulerManager class to manage multiple schedulers
class SchedulerManager {
  constructor() {
    this.jobs = {};
  }

  // Add a new job
  addJob(name, schedule, task) {
    if (this.jobs[name]) {
      console.log(`Job ${name} already exists. Replacing it with the new one.`);
      this.stopJob(name); // Stop the existing job if it exists
    }

    const job = cron.schedule(schedule, task);
    this.jobs[name] = job;
    console.log(`Job ${name} scheduled with cron expression: ${schedule}`);
  }

  // Stop a job
  stopJob(name) {
    if (this.jobs[name]) {
      this.jobs[name].stop();
      console.log(`Job ${name} stopped.`);
    } else {
      console.log(`No job found with the name ${name}.`);
    }
  }

  // Start a job
  startJob(name) {
    if (this.jobs[name]) {
      this.jobs[name].start();
      console.log(`Job ${name} started.`);
    } else {
      console.log(`No job found with the name ${name}.`);
    }
  }

  // List all jobs
  listJobs() {
    return Object.keys(this.jobs);
  }
}

// Create a singleton instance of SchedulerManager
const schedulerManager = new SchedulerManager();

const startRedisSyncScheduler = () => {
  // schedulerManager.addJob(
  //   "syncRedisToMongoDB",
  //   "*/30 * * * * *", // Runs every 30 seconds
  //   async () => {
  //     console.log("🔄 Syncing Redis data to MongoDB...");
  //     await syncRedisToMongoDB();
  //   }

  schedulerManager.addJob(
    "syncRedisToMongoDB",
    "*/30 * * * *", // Runs every 1 minute
    async () => {
      console.log("🔄 Syncing Redis data to MongoDB...");
      // await syncRedisToMongoDB();
      // await syncOnlineStatusToDB();
    }
  );
  schedulerManager.addJob(
    "subscriptionExpiryJob",
    "1 0 * * *", // Runs daily at 00:01 AM
    async () => {
      console.log("⏰ Subscription Expiry Job Started...");
      // await subscriptionExpiryJob();
    }
  );
};

// Export the function to start all schedulers
export const startSchedulers = () => {
  // startPostScheduler(); // Start the daily verse publishing scheduler
  // console.log("Schedulers started successfully.");
  startRedisSyncScheduler();
  // Add more scheduler starters below if needed
};
