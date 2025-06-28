import express from "express";
import cors from "cors";
// import { Pool } from "pg";
import bcrypt from "bcrypt";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import db from "./databases/db_connection.js";
import setupDatabase from "./databases/setup.js";
// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // allow React frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.post("/api/register/insurance-company", async (req, res) => {
  const { name, email, phone, address, password, confirmPassword } = req.body;
  try {
    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.pool.query(
      `INSERT INTO insurance_company (name, email, phone, address, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, address,password`,
      [name, email, phone, address, hashedPassword]
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
    const PORT = process.env.PORT || 3001;
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
