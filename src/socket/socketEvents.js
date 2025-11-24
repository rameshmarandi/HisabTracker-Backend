import redisClient from "../cache/redisClient.js";
import {
  getLocationKeyByRole,
  // LOCATION_KEY,
  updateUserLocation,
} from "../services/locationService.js";
import { sendSlackAlert } from "../services/slackService.js";
import { User } from "../models/User/Auth/user.model.js";
import { getConnectedUsers, getSocketIO } from "./index.js";
// export const LAST_UPDATED_KEY = "user_last_updated ";
const RATE_LIMIT_SECONDS = 5;
export const LOCATION_QUEUE_KEY = "user_location_queue";
export const ONLINE_STATUS_KEY = "worker_online_status";

export const BUSY_STATUS_KEY = "worker_busy_status";
export const handleSocketEvents = (socket) => {
  console.log(`⚡ Handling events for: ${socket.id}`);

  // ✅ Manual Go Online (store in Redis)
  socket.on("manualGoOnline", async () => {
    const userId = socket.userId;
    console.log(`🟢 User ${userId} marked online (Redis)`);

    try {
      await redisClient.hset(ONLINE_STATUS_KEY, userId, "online");
      await emitWorkerCurrentOnlineStatus(userId); // 🔥 emit new status
    } catch (err) {
      console.error("❌ Redis set online error:", err);
    }
  });

  // ✅ Manual Go Offline (store in Redis)
  socket.on("manualGoOffline", async () => {
    const userId = socket.userId;
    console.log(`🔴 User ${userId} marked offline (Redis)`);

    try {
      await redisClient.hset(ONLINE_STATUS_KEY, userId, "offline");
      await emitWorkerCurrentOnlineStatus(userId); // 🔥 emit new status
    } catch (err) {
      console.error("❌ Redis set offline error:", err);
    }
  });

  socket.on("updateLocation", async (data) => {
    const userId = socket.userId;
    const role = socket.roleType; // Make sure to assign this on connection
    const { lat, lng } = data;

    if (!userId || !role || lat == null || lng == null) {
      console.warn("⚠️ Invalid location data or missing role");
      return;
    }

    const LOCATION_KEY = getLocationKeyByRole(role); // 🔥 Separate keys by role
    console.log("Lodation_Keys", LOCATION_KEY);

    const LOCATION_QUEUE_KEY = `${LOCATION_KEY}:queue`;

    try {
      const pipeline = redisClient.pipeline();

      // Get last update timestamp and location
      pipeline.zscore(`${LOCATION_KEY}:timestamps`, userId);
      pipeline.hgetall(`${LOCATION_QUEUE_KEY}:${userId}`);
      const results = await pipeline.exec();

      const lastUpdated = results[0][1] ? parseInt(results[0][1], 10) : null;
      const lastLocation = results[1][1] ?? {};
      const currentTime = Date.now();

      // Rate limit
      if (
        lastUpdated &&
        currentTime - lastUpdated < RATE_LIMIT_SECONDS * 1000
      ) {
        console.log(`⏳ ${role} ${userId} updating too fast — queued`);
        await redisClient.hmset(`${LOCATION_QUEUE_KEY}:${userId}`, {
          lat,
          lng,
          timestamp: currentTime,
        });
        return;
      }

      // Avoid unnecessary updates
      if (lastLocation.lat && lastLocation.lng) {
        const lastLat = parseFloat(lastLocation.lat);
        const lastLng = parseFloat(lastLocation.lng);
        const distanceMoved = Math.sqrt(
          (lat - lastLat) ** 2 + (lng - lastLng) ** 2
        );
        if (distanceMoved < 0.0001) {
          console.log(`🔄 ${role} ${userId} moved insignificantly`);
          return;
        }
      }

      // Proceed to update
      pipeline.zadd(`${LOCATION_KEY}:timestamps`, currentTime, userId);
      pipeline.del(`${LOCATION_QUEUE_KEY}:${userId}`);
      await updateUserLocation(userId, lat, lng, role); // 🔥 pass role
      await pipeline.exec();

      console.log(`✅ Location updated for ${role} ${userId}`);
    } catch (error) {
      sendSlackAlert("❌ Error updating location in socket event:", error);
      console.error("❌ Location socket error:", error);
    }
  });

  // socket.on("updateLocation", async (data) => {
  //   console.log("📥 Received location update:");
  //   const userId = socket.userId;
  //   console.log("Updated_socket_details", socket);
  //   const { lat, lng } = data;

  //   if (!userId || lat == null || lng == null) {
  //     console.warn("⚠️ Invalid data received");
  //     return;
  //   }

  //   try {
  //     const pipeline = redisClient.pipeline();
  //     pipeline.zscore(LOCATION_KEY, userId);
  //     pipeline.hgetall(`${LOCATION_QUEUE_KEY}:${userId}`);
  //     const results = await pipeline.exec();

  //     const lastUpdated = results[0][1] ? parseInt(results[0][1], 10) : null;
  //     const lastLocation = results[1][1] ? results[1][1] : {};
  //     const currentTime = Date.now();

  //     if (
  //       lastUpdated &&
  //       currentTime - lastUpdated < RATE_LIMIT_SECONDS * 1000
  //     ) {
  //       console.log(`⏳ User ${userId} updated too soon, queuing location...`);
  //       await redisClient.hmset(`${LOCATION_QUEUE_KEY}:${userId}`, {
  //         lat,
  //         lng,
  //         timestamp: currentTime,
  //       });
  //       return;
  //     }

  //     if (lastLocation.lat && lastLocation.lng) {
  //       const lastLat = parseFloat(lastLocation.lat);
  //       const lastLng = parseFloat(lastLocation.lng);
  //       const distanceMoved = Math.sqrt(
  //         (lat - lastLat) ** 2 + (lng - lastLng) ** 2
  //       );
  //       if (distanceMoved < 0.0001) {
  //         console.log(
  //           `🔄 User ${userId} moved insignificantly, skipping update.`
  //         );
  //         return;
  //       }
  //     }

  //     pipeline.zadd(LOCATION_KEY, currentTime, userId);
  //     pipeline.del(`${LOCATION_QUEUE_KEY}:${userId}`);
  //     await updateUserLocation(userId, lat, lng);
  //     await pipeline.exec();

  //     //   console.log(`✅ Location updated for user ${userId}: (${lat}, ${lng})`);
  //   } catch (error) {
  //     sendSlackAlert("❌ Error updating location in socket event:", error);
  //     console.error("❌ Error updating location in socket event:", error);
  //   }
  // });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`⚠️ Client disconnected: ${socket.id}`);
  });
};

export const emitWorkerCurrentOnlineStatus = async (userId) => {
  const connectedUsers = getConnectedUsers();
  const socketId = connectedUsers.get(userId);
  const io = getSocketIO();

  if (!socketId) {
    console.warn(`⚠️ Cannot emit status: User ${userId} not connected`);
    return;
  }

  try {
    const [onlineStatus, busyStatus] = await Promise.all([
      redisClient.hget(ONLINE_STATUS_KEY, userId),
      redisClient.hget(BUSY_STATUS_KEY, userId),
    ]);

    const payload = {
      isOnline: onlineStatus === "online",
      isBusy: busyStatus === "true",
    };

    io.to(socketId).emit("statusSync", payload);
  } catch (err) {
    console.error("❌ Failed to emit worker status:", err);
  }
};

// set the worker is busy or release
export const setBusyStatus = async (userId, isBusy = true) => {
  await redisClient.hset(BUSY_STATUS_KEY, userId, String(isBusy));
  await emitWorkerCurrentOnlineStatus(userId); // 🔥 emit to frontend
};
