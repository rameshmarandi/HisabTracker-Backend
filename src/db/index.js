import express from "express";
import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import { sendSlackAlert } from "../services/slackService.js";
import { ENV } from "../utils/env.js";

const connectDB = async () => {
  try {
    // console.log("DB_URLD", ENV.MONGODB_URL);
    const connectionInstance = await mongoose.connect(
      `${ENV.MONGODB_URL}${DB_NAME}`
    );
    console.log(
      `✅ 🔒🛡️ MongoDB connected Successfully !! 🖥️ Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    await sendSlackAlert(
      `⚠️ Database connection Failederror: ${error.message}`
    );
    console.error("DB connection error", error);
    process.exit(1);
  }
};

export default connectDB;
