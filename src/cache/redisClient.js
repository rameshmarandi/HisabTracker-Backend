import Redis from "ioredis";
import dotenv from "dotenv";
import { sendSlackAlert } from "../services/slackService.js";
import { ENV } from "../utils/env.js";

dotenv.config();

console.log("Redis_server", {
  url: ENV.REDIS_URL,
  port: ENV.REDIS_PORT,
});
const redisClient = new Redis({
  host: ENV.REDIS_URL || "127.0.0.1",
  port: ENV.REDIS_PORT ? Number(ENV.REDIS_PORT) : 6379,
  password: ENV.REDIS_PASSWORD || undefined,
  tls: ENV.REDIS_USE_TLS === "true" ? { rejectUnauthorized: false } : undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 500, 5000); // Exponential backoff (Max: 5s)
    if (times >= 5) {
      sendSlackAlert("🚨 CRITICAL: Redis Connection Failed after 5 retries.");
      console.error(
        "❌ [Cache] Redis Connection Failed after multiple attempts."
      );
      return null; // Stop retrying
    }
    console.warn(`⚠️ [Cache] Redis retrying in ${delay}ms...`);
    return delay;
  },
});

// ✅ Handle Redis Events
redisClient.on("connect", () => console.log("✅ [Cache] Connected to Redis."));
redisClient.on("ready", () => console.log("✅ 🎉 [Cache] Redis is ready."));
redisClient.on("error", (err) => {
  sendSlackAlert(`🚨 CRITICAL: Redis Error - ${err.message}`);
  console.error("❌ [Cache] Redis error:", err);
});
redisClient.on("end", () => {
  console.warn("⚠️ [Cache] Redis connection ended. Attempting to reconnect...");
});

// ✅ Test connection on startup
redisClient
  .ping()
  .then((res) => {
    if (res === "PONG") console.log("✅ [Cache] Redis Ping Successful.");
  })
  .catch((err) => {
    console.error("❌ [Cache] Redis Ping Failed:", err);
  });

export default redisClient;
