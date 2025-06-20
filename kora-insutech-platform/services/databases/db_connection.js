import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

export default {
  pool,
  connect: () => pool.connect(),
  testConnection,
};
