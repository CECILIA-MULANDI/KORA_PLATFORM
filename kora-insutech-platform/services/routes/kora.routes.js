import express from "express";
import KoraController from "../controllers/kora.controller.js";

const router = express.Router();
const koraController = new KoraController();

// KORA Dashboard Routes (Public - for transparency)
// These routes don't require authentication as they provide public transparency

// Main dashboard overview
router.get("/kora/dashboard", koraController.getDashboardOverview.bind(koraController));

// Real-time device monitoring across all companies
router.get("/kora/devices", koraController.getDeviceMonitoring.bind(koraController));

// Real-time incident monitoring (anomalies)
router.get("/kora/incidents", koraController.getIncidentMonitoring.bind(koraController));

// Insurance company transparency report
router.get("/kora/companies", koraController.getCompanyTransparency.bind(koraController));

// Live data stream status
router.get("/kora/live-status", koraController.getLiveDataStatus.bind(koraController));

export default router;
