import express from "express";
import policyController from "../controllers/policy.controller.js";
import { authenticateInsurer } from "../middleware/auth.middleware.js";
import {
  uploadPolicyDocument,
  handleUploadError,
} from "../middleware/upload.middleware.js";

const router = express.Router();

// All policy routes require authentication
router.use(authenticateInsurer);

// Document upload and AI extraction routes
router.post(
  "/policies/upload",
  uploadPolicyDocument,
  handleUploadError,
  policyController.uploadPolicyDocument
);
router.post("/policies/confirm", policyController.confirmPolicyData);
router.get(
  "/policies/pending-extractions",
  policyController.getPendingExtractions
);

// Policy CRUD operations
router.get("/policies", policyController.getPolicies);
router.get("/policies/:id", policyController.getPolicyById);

export default router;
