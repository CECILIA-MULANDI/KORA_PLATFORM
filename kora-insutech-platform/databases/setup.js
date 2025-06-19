const db = require("./db_connection");
const createTables = require("./create_tables");
async function setupDatabase() {
  const client = await db.connect();
  try {
    await client.query(createTables.insurance_company);
  } catch (e) {
    console.error("Error creating tables:", e);
  }
}

module.exports = {
  setupDatabase,
};
