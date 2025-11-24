import { Server } from "socket.io";
import { sendSlackAlert } from "../services/slackService.js";
import jwt from "jsonwebtoken";

import { ENV } from "../utils/env.js";
// import { JobRequest } from "../models/User/Booking/jobRequest.model.js";
// import {
//   clearJobFromAllWorkerQueues,
//   clearJobTimeouts,
// } from "../helpers/User/Booking/booking.helper.js";

let io; // Store the socket instance globally
const connectedUsers = new Map(); // userId => socketId mapping

export const initializeSocket = (server) => {
  if (io) {
    console.warn("⚠️ Socket.IO is already initialized!");
    return io; // Prevent multiple initializations
  }

  io = new Server(server, {
    cors: {
      origin: ENV.CORS_ORIGIN, // Allow frontend domain
      credentials: true,
    },
  });

  console.log("✅ Socket.IO initialized successfully! 🚀");

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
  });

  io.on("connection", async (socket) => {
    console.log(`⚡ New client connected: ${socket.id}`);

    socket.on("disconnect", async () => {
      console.log(`⚠️ Client disconnected: ${socket.id}`);
    });

    socket.on("error", (err) => {
      console.error(`🚨 Socket error [${socket.id}]:`, err);
      sendSlackAlert(
        `🚨 Critical Socket Error [${socket.id}]: ${err.stack || err.message}`
      );
    });
  });

  return io;
};

// Prevent Access Before Initialization
export const getSocketIO = () => {
  if (!io) {
    throw new Error("❌ Socket.IO has not been initialized!");
  }
  return io;
};
// Export Connected Users Map
export const getConnectedUsers = () => connectedUsers;
