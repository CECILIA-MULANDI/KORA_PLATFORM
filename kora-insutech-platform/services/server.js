import app from "./app.js";
import dotenv from "dotenv";
dotenv.config();
import db from "./databases/db_connection.js";
import setupDatabase from "./databases/setup.js";

// initialize db and server
async function startServer() {
  try {
    console.log("🚀 Starting insurance app...");

    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Database connection failed");
    }

    // Setup database tables
    await setupDatabase();

    // Start the server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`🏢 Insurance companies API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}
startServer();
