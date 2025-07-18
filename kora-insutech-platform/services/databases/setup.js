import db from "./db_connection.js";
import { createTables } from "./models/insurance_company.js";

async function setupDatabase() {
  const client = await db.connect();
  try {
    console.log("📋 Setting up database tables...");

    // Create insurance company table first (referenced by policies)
    await client.query(createTables.insurance_company);
    console.log("✅ Insurance company table created");

    // Create policies table
    await client.query(createTables.policies);
    console.log("✅ Policies table created");

    // Create policy extractions table (for AI processing)
    await client.query(createTables.policy_extractions);
    console.log("✅ Policy extractions table created");

    // Create IoT devices table
    await client.query(createTables.iot_devices);
    console.log("✅ IoT devices table created");

    // Create incident alerts table
    await client.query(createTables.incident_alerts);
    console.log("✅ Incident alerts table created");

    console.log("🎉 All database tables set up successfully!");
  } catch (e) {
    console.error("❌ Error creating tables:", e);
  } finally {
    client.release();
  }
}

export default setupDatabase;
