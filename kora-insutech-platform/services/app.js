import express from "express";
import cors from "cors";
import insurerRoutes from "./routes/insurance.routes.js";
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // allow React frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use("/api", insurerRoutes);
export default app;
