import Joi from "joi";

export const updateDeviceInfoSchema = Joi.object({
  firebaseToken: Joi.string().optional(),

  deviceName: Joi.string().min(2).max(100).optional(),

  deviceInfo: Joi.object({
    brand: Joi.string().allow("").optional(),
    model: Joi.string().allow("").optional(),
    osVersion: Joi.string().allow("").optional(),
    manufacturer: Joi.string().allow("").optional(),
    deviceId: Joi.string().min(3).optional(), // Device ID must be valid
    appVersion: Joi.string().allow("").optional(),
    buildNumber: Joi.string().allow("").optional(),
    isEmulator: Joi.boolean().optional(),
  })
    .default({})
    .unknown(false), // ❌ no extra keys allowed in deviceInfo
}).unknown(false); // ❌ no extra keys allowed in main body
