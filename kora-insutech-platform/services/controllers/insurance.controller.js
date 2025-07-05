import bcrypt from "bcrypt";
import db from "../databases/db_connection.js";
import jwt from "jsonwebtoken";
import { jwtSecret, jwtExpiration } from "../config/auth.js";
class InsurerController {
  async registerInsurer(req, res) {
    const { name, email, phone, address, password, confirmPassword } = req.body;
    try {
      if (
        !name ||
        !email ||
        !phone ||
        !address ||
        !password ||
        !confirmPassword
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }
      const existingInsurer = await db.pool.query(
        "SELECT * FROM insurance_company WHERE email = $1",
        [email]
      );
      if (existingInsurer.rows.length > 0) {
        return res
          .status(409)
          .json({ message: "Insurer with this email already exists." });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.pool.query(
        `INSERT INTO insurance_company (name, email, phone, address, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, address,password`,
        [name, email, phone, address, hashedPassword]
      );
      const newInsurer = result.rows[0];
      const payload = {
        id: newInsurer.id,
        email: newInsurer.email,
      };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
      res.status(201).json({
        message: "Insurance company registered successfuly!",
        token,
        user: {
          id: newInsurer.id,
          insurance_company_name: newInsurer.name,
          email: newInsurer.email,
          phone: newInsurer.phone,
          address: newInsurer.address,
        },
      });
    } catch (e) {
      console.error("Error creating insurance company:", e);

      if (e.code === "23505") {
        // Unique violation
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    try {
      const result = await db.pool.query(
        "SELECT * FROM insurance_company WHERE email = $1",
        [email]
      );
      const insurer = result.rows[0];
      if (!insurer) {
        return res.status(401).json({ message: "Invalid credentials." });
      }
      const isPasswordValid = await bcrypt.compare(password, insurer.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials." });
      }
      const payload = {
        id: insurer.id,
        email: insurer.email,
      };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
      res.status(200).json({
        message: "Login successful!",
        token,
        user: {
          id: insurer.id,
          email: insurer.email,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Server error during login." });
    }
  }
}
export default new InsurerController();
