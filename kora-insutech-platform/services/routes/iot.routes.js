import express from "express";
import iotController from "../controllers/iot.controller.js";
import { authenticateInsurer } from "../middleware/auth.middleware.js";

const router = express.Router();

// All IoT routes require authentication
router.use(authenticateInsurer);

// IoT Device Management
router.post("/iot/devices/register", iotController.registerDevice);
router.get("/iot/devices", iotController.getDevices);
router.get("/iot/devices/:deviceId", iotController.getDeviceById);
router.put("/iot/devices/:deviceId/status", iotController.updateDeviceStatus);

// IoT Device to Policy Linking
router.post("/iot/devices/link", iotController.linkDeviceToPolicy);
router.delete("/iot/devices/:deviceId/unlink", iotController.unlinkDeviceFromPolicy);
router.get("/iot/policies/available", iotController.getAvailablePolicies);

export default router;
