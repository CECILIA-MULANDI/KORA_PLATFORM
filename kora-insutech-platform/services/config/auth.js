require("dotenv").config();
module.exports = {
  jwtSecret: process.env.JWT_SECRET || "somethingsorandomforkorainsutech",
  jwtExpiration: "1h",
  jwtRefreshExpiration: "7d",
};
