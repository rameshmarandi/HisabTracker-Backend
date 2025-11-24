import dotenv from "dotenv";
dotenv.config();
export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  // # "production"
  ENABLE_ENCRYPTION: process.env.ENABLE_ENCRYPTION,
  BASE_URL: process.env.BASE_URL,

  //   # Firebase setup
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,

  //   # DB connection
  PORT: process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,

  MONGODB_URL: process.env.MONGODB_URL,
  LINK_SECRET_KEY: process.env.LINK_SECRET_KEY,

  //   Caching
  CACHE_TYPE: process.env.CACHE_TYPE,

  REDIS_URL: process.env.REDIS_URL,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_USE_TLS: process.env.REDIS_USE_TLS,

  //   Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  // # Tokens
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

  // # Cloudinary
  CLOUDINARY_CLOUDE_NAME: process.env.CLOUDINARY_CLOUDE_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_SECRET_KEY: process.env.CLOUDINARY_SECRET_KEY,

  // # Crypto

  AES_SECRET_KEY: process.env.AES_SECRET_KEY,
  AES_IV: process.env.AES_IV,

  // #Google map
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
};
