import bcrypt from "bcrypt";
import db from "../databases/db_connection.js";
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
      res.status(201).json({ result });
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
      const result = await db.pool.query('SELECT * FROM insurance_company WHERE email = $1', [email])
      const insurer = result.rows[0];
    } catch () {
      
    }

  }
}
export default new InsurerController();
