import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  deviceId: Joi.string().min(3).required(),
  referralCode: Joi.string().allow("", null).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  deviceId: Joi.string().min(3).required(),
});

export const logoutSchema = Joi.object({
  deviceId: Joi.string().min(3).required(),
}).unknown(false);
