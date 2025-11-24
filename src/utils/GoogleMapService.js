import axios from "axios";
import { ENV } from "./env.js";

export const detectAreaType = async (lat, lng) => {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}`
  );

  const result = response.data.results[0];
  const addressComponents = result?.address_components || [];

  const cityComponent = addressComponents.find(
    (c) =>
      c.types.includes("locality") ||
      c.types.includes("administrative_area_level_2")
  );

  const areaType = cityComponent ? "urban" : "rural";

  return {
    areaType,
    city: cityComponent ? cityComponent.long_name : null,
    fullAddress: result ? result.formatted_address : null,
  };
};
