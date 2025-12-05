import Joi from "joi";

export const updateDeviceInfoSchema = Joi.object({
  firebaseToken: Joi.string().allow("").optional(),

  deviceName: Joi.string().allow("").optional(),

  deviceInfo: Joi.object({
    platform: Joi.string().allow("").optional(),
    model: Joi.string().allow("").optional(),
    osVersion: Joi.string().allow("").optional(),
    manufacturer: Joi.string().allow("").optional(),
    deviceId: Joi.string().allow("").optional(),
    appVersion: Joi.string().allow("").optional(),
    buildNumber: Joi.string().allow("").optional(),
    isEmulator: Joi.boolean().optional(),
  })
    .default({})
    .unknown(false),
}).unknown(false);
