import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import admin from "firebase-admin";
import compression from "compression";

//Firebase configuration
import "../src/services/firebaseAdmin.js";
// console.log("Servier", process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'))
// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//   }),
// });

const app = express();
// Rate limiting middleware setup

// Apply rate limiting to all requests
// app.use(globalRateLimiter); // Apply rate limiting
app.use(compression()); // Compress responses for better performance
// app.use(restrictToIndia); // Restrict access to NON-Indian IP addresses
// app.use(blockVpnTraffic); // Block VPN traffic

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://192.168.0.105:8085",
      "https://uat.kamsati.com",
    ],
    //  process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(payloadCrypto.encryptResponseMiddleware()); // ✅ Encrypt response payloads
app.use(payloadCrypto.decryptRequestMiddleware()); // ✅ Decrypt request payloads

app.use(express.static("public"));

//admin routes

//User routes
import encryptionRouter from "./routers/User/Encryption/encryption.routes.js";

import { globalRateLimiter } from "./services/rateLimiter.js";
import { restrictToIndia } from "./middlewares/geoMiddleware.js";
import { blockVpnTraffic } from "./services/geoipService.js";
import requestLogger from "./middlewares/requestLogger.js";
import errorHandler from "./middlewares/errorHandler.js";
import helmetConfig from "./middlewares/helmetConfig.js";
import { startSchedulers } from "./utils/schedulerManager.js";
import payloadCrypto from "./services/payloadCryptoService.js";

import rateLimit from "express-rate-limit";
import { ENV } from "./utils/env.js";
// Admin
import appConfig from "./routers/Admin/AppConfig/appConfig.router.js";
import adConfig from "./routers/Admin/AppConfig/adConfig.routes.js";

// User
import authRouter from "./routers/User/Auth/auth.routes.js";

// startSchedulers();
//
//Declaration of routes

app.use("/api/v1", encryptionRouter); // encryption || decryption

//Admin
app.use("/api/v1/config", appConfig);
app.use("/api/v1/adConfig", adConfig);

// User
app.use("/api/v1/user", authRouter);

app.use(requestLogger); // ✅ Logs all incoming requests
// ✅ Global Error Handler (Logs only errors)
app.use(errorHandler);

//Uncomment this lines when bullMQ notification status dashboard

// const bullBoardLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 30, // limit to 30 requests/minute per IP
//   message: "Too many requests to BullBoard from this IP. Try again later.",
// });

// app.use("/bullboard", bullBoardLimiter, bullBoardAdapter.getRouter());

// Apply dynamic helmet config
// helmetConfig(app);
export { app };
