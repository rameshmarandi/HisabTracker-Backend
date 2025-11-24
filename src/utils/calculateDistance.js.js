import { getDistance } from "geolib";

export const calculateDistance = (from, to) => {
  const distanceInMeters = getDistance(from, to);

  if (distanceInMeters >= 1000) {
    const distanceInKm = Math.round(distanceInMeters / 1000);
    return `${distanceInKm} km`;
  } else {
    return `${distanceInMeters} m`;
  }
};
