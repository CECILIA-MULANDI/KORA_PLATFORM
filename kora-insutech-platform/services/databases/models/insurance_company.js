// query to create registration for insurance company
const createTables = {
  insurance_company: `
    
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    
    CREATE TABLE IF NOT EXISTS insurance_company (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL,
      address TEXT NOT NULL,
      password VARCHAR (255) NOT NULL,

   
      kora_insurer_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
      blockchain_registered BOOLEAN DEFAULT FALSE,
      blockchain_tx_hash VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   
    );

  
    CREATE INDEX IF NOT EXISTS idx_kora_insurer_id ON insurance_company (kora_insurer_id);
    CREATE INDEX IF NOT EXISTS idx_insurer_wallet_address ON insurance_company (insurer_wallet_address);
  `,
};

export { createTables };
