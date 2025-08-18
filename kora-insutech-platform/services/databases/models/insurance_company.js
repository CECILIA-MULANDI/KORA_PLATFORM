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



  `,

  policies: `
    -- Create policies table
    CREATE TABLE IF NOT EXISTS policies (
      id SERIAL PRIMARY KEY,
      policy_number VARCHAR(100) UNIQUE NOT NULL,
      policy_holder_name VARCHAR(255) NOT NULL,
      policy_holder_email VARCHAR(255) NOT NULL,
      policy_holder_phone VARCHAR(20),
      policy_type VARCHAR(100) NOT NULL, -- e.g., 'auto', 'health', 'life', 'property'
      coverage_amount DECIMAL(15,2) NOT NULL,
      premium_amount DECIMAL(10,2) NOT NULL,
      deductible_amount DECIMAL(10,2) DEFAULT 0,
      policy_start_date DATE NOT NULL,
      policy_end_date DATE NOT NULL,
      policy_status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'pending'

      -- Insurance company reference
      insurance_company_id INTEGER NOT NULL REFERENCES insurance_company(id) ON DELETE CASCADE,

      -- File storage
      policy_document_url VARCHAR(500), -- URL to stored policy document
      policy_document_filename VARCHAR(255),
      policy_document_size INTEGER, -- file size in bytes

      -- Blockchain integration
      kora_policy_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
      blockchain_registered BOOLEAN DEFAULT FALSE,
      blockchain_tx_hash VARCHAR(255),

      -- AI extraction metadata
      extraction_confidence INTEGER DEFAULT 0, -- 0-100 confidence score from AI extraction
      additional_info JSONB, -- Additional extracted information

      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_policies_insurance_company ON policies(insurance_company_id);
    CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(policy_status);
    CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);
    CREATE INDEX IF NOT EXISTS idx_policies_kora_id ON policies(kora_policy_id);
  `,

  policy_extractions: `
    -- Create policy extractions table for temporary storage during AI processing
    CREATE TABLE IF NOT EXISTS policy_extractions (
      id SERIAL PRIMARY KEY,
      temp_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
      insurance_company_id INTEGER NOT NULL REFERENCES insurance_company(id) ON DELETE CASCADE,

      -- File information
      original_filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_url VARCHAR(500) NOT NULL,

      -- Extraction results
      extracted_text TEXT,
      structured_data JSONB NOT NULL,
      confidence_score INTEGER DEFAULT 0,

      -- Processing status
      extraction_status VARCHAR(50) DEFAULT 'pending_review', -- 'pending_review', 'completed', 'failed'
      policy_id INTEGER REFERENCES policies(id) ON DELETE SET NULL, -- Set after confirmation

      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_extractions_temp_id ON policy_extractions(temp_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_insurance_company ON policy_extractions(insurance_company_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_status ON policy_extractions(extraction_status);
  `,

  iot_devices: `
    -- Create IoT devices table for tracking devices assigned to policies
    CREATE TABLE IF NOT EXISTS iot_devices (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(100) UNIQUE NOT NULL, -- Physical device identifier
      device_type VARCHAR(50) NOT NULL, -- 'car_tracker', 'health_monitor', etc.
      device_model VARCHAR(100),
      device_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'maintenance', 'lost'

      -- Policy association
      policy_id INTEGER REFERENCES policies(id) ON DELETE SET NULL,
      assigned_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      -- Device metadata
      last_ping TIMESTAMP WITH TIME ZONE,
      battery_level INTEGER, -- 0-100
      firmware_version VARCHAR(50),
      location_data JSONB, -- Current GPS coordinates and location history

      -- Blockchain integration
      kora_device_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
      blockchain_registered BOOLEAN DEFAULT FALSE,
      blockchain_tx_hash VARCHAR(255),

      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_devices_policy ON iot_devices(policy_id);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON iot_devices(device_status);
    CREATE INDEX IF NOT EXISTS idx_devices_kora_id ON iot_devices(kora_device_id);
  `,

  incident_alerts: `
    -- Create incident alerts table for IoT-detected incidents
    CREATE TABLE IF NOT EXISTS incident_alerts (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(100) UNIQUE NOT NULL,

      -- Device and policy references
      device_id INTEGER NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
      policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,

      -- Incident details
      incident_type VARCHAR(100) NOT NULL, -- 'collision', 'theft', 'speeding', 'harsh_braking', etc.
      severity_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
      incident_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

      -- Location and sensor data
      incident_location JSONB, -- GPS coordinates, address
      sensor_data JSONB, -- Accelerometer, gyroscope, speed, etc.

      -- Alert status
      alert_status VARCHAR(50) DEFAULT 'new', -- 'new', 'acknowledged', 'investigating', 'resolved', 'false_positive'
      acknowledged_by VARCHAR(100), -- Who acknowledged the alert
      acknowledged_at TIMESTAMP WITH TIME ZONE,

      -- Notifications sent
      kora_notified BOOLEAN DEFAULT FALSE,
      insurance_notified BOOLEAN DEFAULT FALSE,
      user_notified BOOLEAN DEFAULT FALSE,

      -- Resolution
      resolution_notes TEXT,
      estimated_damage_amount DECIMAL(15,2),

      -- Blockchain integration
      kora_incident_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
      blockchain_registered BOOLEAN DEFAULT FALSE,
      blockchain_tx_hash VARCHAR(255),
      blockchain_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
      blockchain_recorded_at TIMESTAMP WITH TIME ZONE, -- When blockchain recording completed

      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_incidents_device ON incident_alerts(device_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_policy ON incident_alerts(policy_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incident_alerts(alert_status);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incident_alerts(severity_level);
    CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incident_alerts(incident_timestamp);
    CREATE INDEX IF NOT EXISTS idx_incidents_kora_id ON incident_alerts(kora_incident_id);
  `,
};

export { createTables };
