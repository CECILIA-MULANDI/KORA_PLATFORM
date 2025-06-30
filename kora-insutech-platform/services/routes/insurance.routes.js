import express from "express";
import insuranceController from "../controllers/insurance.controller.js";
const router = express.Router();
router.post("/register/insurance-company", insuranceController.registerInsurer);
router.post("/login/insurance-company", insuranceController.login);
export default router;
