import geoip from 'geoip-lite';
import { sendSlackAlert } from './slackService.js';

export const getGeoInfo = (ip) => {
  const geo = geoip.lookup(ip);
  if (!geo) return null;

  return {
    country: geo.country,
    city: geo.city,
    region: geo.region,
    timezone: geo.timezone,
    isp: geo.org, // ISP info (if available)
  };
};

export const isIndiaRequest = (ip) => {
  const geo = geoip.lookup(ip);
  return geo?.country === 'IN';
};


export const blockVpnTraffic = async(req, res, next) => {
    const ip = req.ip;
    const geo = getGeoInfo(ip);
  
    if (geo?.isp?.toLowerCase().includes('vpn') || geo?.isp?.toLowerCase().includes('proxy')) {
      console.warn(`Blocked VPN/Proxy traffic from IP: ${ip}`);
      await sendSlackAlert(`⚠️ Blocked VPN/Proxy traffic from IP: ${ip}`);
      return res.status(403).json({ error: 'VPN usage is not allowed.' });
    }
  
    next();
  };