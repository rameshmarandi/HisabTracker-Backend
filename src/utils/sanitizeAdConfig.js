// src/utils/sanitizeAdConfig.js
export const sanitizeAdPlacement = (placementDoc) => ({
  _id: placementDoc._id,
  key: placementDoc.key,
  enabled: placementDoc.enabled,
  type: placementDoc.type,
  frequency: placementDoc.frequency,
  adUnitIdAndroid: placementDoc.adUnitIdAndroid,
  adUnitIdIOS: placementDoc.adUnitIdIOS,
});

// For public API (frontend)
export const buildAdsConfigObject = (placementDocs, showAdsFromAppConfig) => {
  const placementsObj = {};

  placementDocs.forEach((doc) => {
    const p = sanitizeAdPlacement(doc);
    placementsObj[p.key] = {
      enabled: p.enabled,
      _id: p._id,
      type: p.type,
      frequency: p.frequency,
      adUnitIdAndroid: p.adUnitIdAndroid,
      adUnitIdIOS: p.adUnitIdIOS,
    };
  });

  return {
    showAds: !!showAdsFromAppConfig,
    placements: placementsObj,
  };
};
