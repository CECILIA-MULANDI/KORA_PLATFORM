import dotenv from "dotenv";
dotenv.config();

export const jwtSecret =
  process.env.JWT_SECRET || "somethingsorandomforkorainsutech";
export const jwtExpiration = "1h";
export const jwtRefreshExpiration = "7d";
