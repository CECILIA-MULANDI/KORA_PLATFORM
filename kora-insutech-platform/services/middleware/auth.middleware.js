import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/auth.js";

export const authenticateInsurer = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      error: "Invalid token.",
    });
  }
};
