import NodeCache from "node-cache";
import Redis from "ioredis";
import { sendSlackAlert } from "../services/slackService.js";
import redisClient from "./redisClient.js";
import { ENV } from "../utils/env.js";

let cache;
// let redisClient; // 🔹 Declare globally

if (ENV.CACHE_TYPE === "redis") {
  console.log("🚀 [Cache] Using Redis as caching mechanism...");

  cache = {
    set: async (key, value, ttl = 3600) => {
      try {
        redisClient.set(key, JSON.stringify(value), "EX", ttl);
      } catch (err) {
        sendSlackAlert(
          `🚨 CRITICAL: Redis Set Failed - Key: ${key} | Error: ${err.message}`
        );
        console.error(`❌ [Cache] Error setting key: ${key}`, err);
      }
    },
    get: async (key) => {
      try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        sendSlackAlert(
          `🚨 CRITICAL: Redis Get Failed - Key: ${key} | Error: ${err.message}`
        );
        console.error(`❌ [Cache] Error getting key: ${key}`, err);
        return null;
      }
    },
    del: async (key) => {
      try {
        await redisClient.del(key);
      } catch (err) {
        sendSlackAlert(
          `🚨 CRITICAL: Redis Delete Failed - Key: ${key} | Error: ${err.message}`
        );
        console.error(`❌ [Cache] Error deleting key: ${key}`, err);
      }
    },
    clear: async () => {
      try {
        await redisClient.flushdb();
      } catch (err) {
        sendSlackAlert(
          `🚨 CRITICAL: Redis FlushDB Failed - Error: ${err.message}`
        );
        console.error("❌ [Cache] Error clearing Redis cache", err);
      }
    },
  };
} else {
  // ✅ Fallback to NodeCache if Redis is not enabled
  const nodeCache = new NodeCache();
  console.log("✅ 🔄 [Cache] Using NodeCache as a fallback.");

  cache = {
    set: (key, value, ttl = 3600) => nodeCache.set(key, value, ttl),
    get: (key) => nodeCache.get(key) || null,
    del: (key) => nodeCache.del(key),
    clear: () => nodeCache.flushAll(),
  };
}

// ✅ Export cache and Redis client
export { cache };
