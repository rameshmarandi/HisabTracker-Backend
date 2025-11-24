module.exports = {
  apps: [
    {
      name: "kaamsathi-backend",
      script: "./src/app.js",
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster",
      watch: false, // Turn off in production for better stability
      max_memory_restart: "250M", // Adjust based on server capacity
      env: {
        NODE_ENV: "production",
        PORT: 4000, // Example port
      },
    },
  ],
};
