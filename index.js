import connectDB from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";
import http from "http";
// import redisClient from "./cache/redisClient.js";
import { syncBusyStatusFromDb } from "./db/syncBusyStatusFromDb.js";
import { initializeSocket } from "./src/socket/index.js";
import { systemHealthCheck } from "./src/controllers/Admin/System/systemHealthCheck.controller.js";
import { ENV } from "./src/utils/env.js";

dotenv.config({ path: "./env" });

connectDB()
  .then(async () => {
    // 1️⃣ Create HTTP server
    const server = http.createServer(app);

    // 2️⃣ Initialize Socket.IO and attach to app
    // const io = initializeSocket(server);
    // app.set("socketio", io); // ✅ now accessible in routes/controllers

    // 3️⃣ Register routes AFTER io is set
    // import systemRoutes from "./routes/systemRoutes.js";
    // app.use("/api/system", systemHealthCheck);

    // 4️⃣ Sync worker statuses (optional, small delay ensures socket is ready)
    // setTimeout(async () => {
    //   await syncBusyStatusFromDb();
    // }, 200);

    // 5️⃣ Start server
    server.listen(ENV.PORT, () => {
      console.log(`✅ 🚦📡 Server is running on port 🚀 ${ENV.PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error", err);
  });
