import rateLimit from "express-rate-limit";
import { sendSlackAlert } from "./slackService.js";
import { trustedIps } from "../middlewares/adminAccessMiddleware.js";

const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || "Too many requests, please try again later.",
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip || (() => false), // Allow custom IP bypass
    handler: async (req, res, next) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      await sendSlackAlert(
        `⚠️ *Too many failed login attempts* from IP: ${req.ip}`
      );
      res.status(429).json({
        error: "Too many requests, please try again later.",
      });
    },
  });
};

export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Lowering from 100 to 50
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // Max 5 attempts
  message: {
    success: false,
    message: "Too many login attempts. Try again in 5 minutes.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});
export const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skip: (req) => trustedIps.includes(req.ip),
});

export const fileUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Adjust based on server capacity
});
// export const trustedIps = ['127.0.0.1', '::1']; // Bypass for trusted IPs
