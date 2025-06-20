import db from "./db_connection.js";
import { createTables } from "./models/insurance_company.js";

async function setupDatabase() {
  const client = await db.connect();
  try {
    await client.query(createTables.insurance_company);
  } catch (e) {
    console.error("Error creating tables:", e);
  }
}

export default setupDatabase;
