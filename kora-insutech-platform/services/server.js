import express from "express";
import { Pool } from "pg";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import db from "./databases/db_connection.js";
import setupDatabase from "./databases/setup.js";
// Middleware
app.use(express.json());

app.post("/api/register/insurance-company", async (req, res) => {
  const { name, email, phone, address, password } = req.body;
  try {
    const result = await db.pool.query(
      `INSERT INTO insurance_company (name, email, phone, address, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, address, created_at`,
      [name, email, phone, address, password]
    );
    res.status(201).json({ result });
  } catch (e) {
    console.error("Error creating insurance company:", e);

    if (e.code === "23505") {
      // Unique violation
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
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
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(
        `🏢 Insurance companies API: http://localhost:${PORT}/api/insurance-companies`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}
startServer();
