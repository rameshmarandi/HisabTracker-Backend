
import { isIndiaRequest } from "../services/geoipService.js";
import { sendSlackAlert } from "../services/slackService.js";
import logger from "../utils/logger.js";


export const restrictToIndia = async(req, res, next) => {
  // Get real client IP, handle proxy or direct connection
  const ip =
    req.headers["x-forwarded-for"]?.split(",").shift().trim() || req.ip;

  // Allow localhost for development
  if (ip === "::1" || ip === "127.0.0.1") {
    return next();
  }

  // Check if the IP is from India
  if (isIndiaRequest(ip)) {
    return next();
  }

  // Log blocked request and raise alert
  logger.warn(`Blocked request from non-India IP: ${ip}`);
    await sendSlackAlert(`⚠️ Blocked request from non-India IP: ${ip}`);
  // Optional: Send alert if repeated attacks (rate-limiting)
  // sendSlackAlert(`Blocked request from non-India IP: ${ip}`);

  return res.status(403).json({
    error: "Access restricted to Indian users only.",
  });
};
