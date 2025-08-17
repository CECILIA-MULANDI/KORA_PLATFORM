import express from "express";
import SimulationController from "../controllers/simulation.controller.js";
import { authenticateInsurer } from "../middleware/auth.middleware.js";

const router = express.Router();
const simulationController = new SimulationController();

// Apply authentication to all simulation routes
router.use(authenticateInsurer);

// Data statistics and info
router.get(
  "/simulation/stats",
  simulationController.getDataStats.bind(simulationController)
);

// Device simulation control
router.post(
  "/simulation/devices/:deviceId/start",
  simulationController.startDeviceSimulation.bind(simulationController)
);
router.post(
  "/simulation/devices/:deviceId/stop",
  simulationController.stopDeviceSimulation.bind(simulationController)
);
router.get(
  "/simulation/devices/:deviceId/test",
  simulationController.getTestDataPoint.bind(simulationController)
);

// Simulation monitoring
router.get(
  "/simulation/active",
  simulationController.getActiveSimulations.bind(simulationController)
);
router.get(
  "/simulation/incidents",
  simulationController.getRecentIncidents.bind(simulationController)
);

export default router;
