// query to create registration for insurance company
const createTables = {
  insurance_company: `CREATE TABLE IF NOT EXISTS insurance_company (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    password VARCHAR (255) NOT NULL
  );`,
};

export { createTables };
