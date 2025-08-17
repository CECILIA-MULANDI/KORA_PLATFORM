import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import insurerRoutes from "./routes/insurance.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import iotRoutes from "./routes/iot.routes.js";
import simulationRoutes from "./routes/simulation.routes.js";
import koraRoutes from "./routes/kora.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" })); // Increase limit for file uploads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: "http://localhost:3000", // allow React frontend
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", insurerRoutes);
app.use("/api", policyRoutes);
app.use("/api", iotRoutes);
app.use("/api", simulationRoutes);
app.use("/api", koraRoutes); // Public KORA transparency routes

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Kora Insurance Platform API is running",
    timestamp: new Date().toISOString(),
  });
});

export default app;
