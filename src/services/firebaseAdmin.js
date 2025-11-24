import admin from "firebase-admin";
import dotenv from "dotenv";
import { ENV } from "../utils/env.js";
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: ENV.FIREBASE_PROJECT_ID,
      privateKey: ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
    }),
  });
  console.log("✅ [Firebase] Firebase Admin initialized successfully.");
}

export default admin;
