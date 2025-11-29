import connectDB from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";
import http from "http";
import { initializeSocket } from "./socket/index.js";
import redisClient from "./cache/redisClient.js";

import { ENV } from "./utils/env.js";

dotenv.config({ path: "./env" });
// Connect to database and start the server
connectDB()
  .then(async () => {
    console.log(`✅ 🚦📡 Server is running on port 🚀 ${ENV.PORT}`);
    const server = http.createServer(app); // Create HTTP server
    // initializeSocket(server); // Initialize Socket.IO
    // ✅ 2. Wait a tick, then sync
    // setTimeout(async () => {
    //   await syncBusyStatusFromDb();
    // }, 200); // Slight delay ensures socket is initialized

    server.listen(ENV.PORT, () => {
      console.log(`✅ 🚦📡 Server is running on port 🚀 ${ENV.PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error", err);
  });
// connectDB()
// .then(()=>{
//     app.listen(ENV.PORT, ()=>{
//         console.log(`🚦📡 Server is running on port 🚀 ${ENV.PORT}`);
//     })
// })
// .catch((err)=>{
//     console.error("DB connection error", err);
// })

// First Approach
/*
const app = express();
import express from "express";

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error", (error) => {
            console.error("Express not able to connect with DB", error);
            throw error
        })
        app.listen(ENV.PORT, () => console.log(`Server is running on port ${ENV.PORT}`))
    } catch (error) {
        console.error("DB connection error", error);
        throw error
    }
})()

*/
