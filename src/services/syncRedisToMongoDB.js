import mongoose from "mongoose";
import redisClient from "../cache/redisClient.js";
import { sendSlackAlert } from "./slackService.js";
import { User } from "../models/User/Auth/user.model.js";
import { ONLINE_STATUS_KEY } from "../socket/socketEvents.js";

const ROLE_KEYS = {
  user: "user:location",
  worker: "worker:location",
};

const LOCATION_EXPIRY = 60 * 60; // 1 hour
const LOCATION_SYNC_INTERVAL_MS =
  process.env.LOCATION_SYNC_INTERVAL_MS || 30000;

// ✅ Sync geo locations from Redis to MongoDB
export const syncRedisToMongoDB = async () => {
  try {
    const now = Date.now();
    const lastSyncTime = now - LOCATION_SYNC_INTERVAL_MS;

    for (const [role, LOCATION_KEY] of Object.entries(ROLE_KEYS)) {
      const LOCATION_TIMESTAMP_KEY = `${LOCATION_KEY}:timestamps`;

      const userIds = await redisClient.zrangebyscore(
        LOCATION_TIMESTAMP_KEY,
        lastSyncTime,
        "+inf"
      );

      if (!userIds.length) {
        console.log(`⏸ No ${role}s to sync this cycle.`);
        continue;
      }

      const pipeline = redisClient.multi();
      userIds.forEach((id) => {
        pipeline.geopos(LOCATION_KEY, id);
      });

      const results = await pipeline.exec();

      const bulkUpdates = userIds
        .map((id, index) => {
          const position = results[index][1]?.[0];
          if (!position || position.length !== 2) return null;

          const [lng, lat] = position.map(Number);
          return {
            updateOne: {
              filter: { _id: id },
              update: {
                location: {
                  type: "Point",
                  coordinates: [lng, lat],
                },
                lastLocationUpdatedAt: new Date(now),
              },
            },
          };
        })
        .filter(Boolean);

      if (bulkUpdates.length > 0) {
        await User.bulkWrite(bulkUpdates);
        console.log(
          `✅ Synced ${bulkUpdates.length} ${role} locations to MongoDB`
        );
      } else {
        console.log(`⚠️ No valid ${role} locations found in Redis to sync.`);
      }

      // 🧼 Cleanup inactive users after sync
      await cleanupInactiveUsers(role, LOCATION_KEY);
    }
  } catch (error) {
    console.error("❌ Error syncing Redis to MongoDB:", error);
    sendSlackAlert("❌ Redis to MongoDB sync failed", error);
  }
};

// ✅ Sync online/offline status
export const syncOnlineStatusToDB = async () => {
  try {
    console.log("🔄 Syncing online status from Redis to MongoDB...");

    const allStatuses = await redisClient.hgetall(ONLINE_STATUS_KEY);

    if (!allStatuses || Object.keys(allStatuses).length === 0) {
      console.log("⚠️ No online status found in Redis.");
      return;
    }

    const bulkUpdates = Object.entries(allStatuses).map(([userId, status]) => ({
      updateOne: {
        filter: { _id: userId },
        update: { $set: { isOnline: status === "online" } },
      },
    }));

    if (bulkUpdates.length > 0) {
      await User.bulkWrite(bulkUpdates);
      console.log(`✅ Synced ${bulkUpdates.length} online statuses to MongoDB`);
      await redisClient.del("online_status");
    } else {
      console.log("✅ No status changes to update.");
    }
  } catch (error) {
    console.error("❌ Error syncing online status:", error);
    sendSlackAlert("❌ Error syncing online status to DB", error);
  }
};

// ✅ Cleanup inactive users per role
export const cleanupInactiveUsers = async (role, LOCATION_KEY) => {
  try {
    const LOCATION_TIMESTAMP_KEY = `${LOCATION_KEY}:timestamps`;
    const threshold = Date.now() - LOCATION_EXPIRY * 1000;

    const inactiveUsers = await redisClient.zrangebyscore(
      LOCATION_TIMESTAMP_KEY,
      0,
      threshold
    );

    if (!inactiveUsers.length) {
      console.log(`✅ No inactive ${role}s to clean.`);
      return;
    }

    const pipeline = redisClient.multi();
    inactiveUsers.forEach((id) => {
      pipeline.zrem(LOCATION_TIMESTAMP_KEY, id);
      pipeline.zrem(LOCATION_KEY, id);
    });

    await pipeline.exec();
    console.log(
      `🧹 Cleaned ${inactiveUsers.length} inactive ${role}s from Redis`
    );
  } catch (error) {
    console.error(`❌ Error cleaning inactive ${role}s:`, error);
    sendSlackAlert(`❌ Error cleaning up ${role}s`, error);
  }
};
