import { getGeoInfo } from "../services/geoipService.js";

export const trustedIps = ['203.0.113.5', '203.0.113.10' , "127.0.0.1"];

export const adminAccessMiddleware = (req, res, next) => {
  const ip = req.ip;
  const geo = getGeoInfo(ip);

  if (trustedIps.includes(ip) && geo?.country === 'IN') {
    console.log(`Admin access granted to IP: ${ip} (${geo.city}, ${geo.country})`);
    next();
  } else {
    console.warn(`Unauthorized admin access attempt from IP: ${ip}`);
    return res.status(403).json({ error: 'Unauthorized access.' });
  }
};
