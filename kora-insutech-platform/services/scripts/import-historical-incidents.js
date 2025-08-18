import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../databases/db_connection.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HistoricalIncidentImporter {
  constructor() {
    this.csvPath = path.join(__dirname, '../cleaned_data.csv');
    this.speedThreshold = 180; // km/h - speeds above this are considered anomalies
    this.importedCount = 0;
  }

  // Read and parse CSV data
  async loadCSVData() {
    try {
      const csvContent = fs.readFileSync(this.csvPath, 'utf-8');
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          timestamp: parseInt(values[0]),
          latitude: parseFloat(values[1]),
          longitude: parseFloat(values[2]),
          speed_kmh: parseFloat(values[3])
        };
      });

      console.log(`📊 Loaded ${data.length} data points from CSV`);
      return data;
    } catch (error) {
      console.error('❌ Error loading CSV data:', error);
      throw error;
    }
  }

  // Get available devices and policies for incident assignment
  async getAvailableDevicesAndPolicies() {
    try {
      const result = await db.pool.query(`
        SELECT 
          d.id as device_id,
          d.device_id as device_serial,
          d.policy_id,
          p.policy_number,
          p.policy_holder_name,
          p.insurance_company_id
        FROM iot_devices d
        LEFT JOIN policies p ON d.policy_id = p.id
        WHERE d.blockchain_registered = true
        ORDER BY d.id
      `);

      console.log(`📱 Found ${result.rows.length} devices for incident assignment`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      throw error;
    }
  }

  // Determine incident severity based on speed
  getSeverityLevel(speed) {
    if (speed >= 300) return 'critical';
    if (speed >= 250) return 'high';
    if (speed >= 200) return 'medium';
    return 'low';
  }

  // Generate incident type based on speed and conditions
  getIncidentType(speed, location) {
    if (speed >= 300) return 'extreme_speeding';
    if (speed >= 250) return 'dangerous_speeding';
    if (speed >= 200) return 'excessive_speeding';
    if (location.latitude === 0 && location.longitude === 0) return 'gps_anomaly';
    return 'speeding_violation';
  }

  // Create incident record in database
  async createIncidentRecord(dataPoint, device) {
    try {
      const incidentId = `INC-${dataPoint.timestamp}-${device.device_serial}`;
      const severity = this.getSeverityLevel(dataPoint.speed_kmh);
      const incidentType = this.getIncidentType(dataPoint.speed_kmh, {
        latitude: dataPoint.latitude,
        longitude: dataPoint.longitude
      });

      const locationData = {
        latitude: dataPoint.latitude,
        longitude: dataPoint.longitude,
        address: dataPoint.latitude === 0 ? 'GPS Signal Lost' : 'Highway Location'
      };

      const sensorData = {
        speed_kmh: dataPoint.speed_kmh,
        threshold: this.speedThreshold,
        excess_speed: dataPoint.speed_kmh - this.speedThreshold,
        detection_method: 'historical_csv_import'
      };

      const result = await db.pool.query(`
        INSERT INTO incident_alerts (
          incident_id, device_id, policy_id, incident_type, severity_level,
          incident_timestamp, incident_location, sensor_data,
          alert_status, kora_notified, insurance_notified, user_notified,
          blockchain_registered, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, incident_id
      `, [
        incidentId,
        device.device_id,
        device.policy_id,
        incidentType,
        severity,
        new Date(dataPoint.timestamp * 1000), // Convert Unix timestamp to Date
        JSON.stringify(locationData),
        JSON.stringify(sensorData),
        'acknowledged', // Historical incidents are pre-acknowledged
        true, // KORA was notified
        true, // Insurance was notified
        true, // User was notified
        false, // Will be registered on blockchain later
        new Date() // Current timestamp for created_at
      ]);

      this.importedCount++;
      return result.rows[0];
    } catch (error) {
      console.error(`❌ Error creating incident for ${dataPoint.timestamp}:`, error);
      return null;
    }
  }

  // Main import function
  async importHistoricalIncidents() {
    try {
      console.log('🚀 Starting historical incident import...');

      // Load CSV data
      const csvData = await this.loadCSVData();

      // Get available devices
      const devices = await this.getAvailableDevicesAndPolicies();
      
      if (devices.length === 0) {
        console.log('⚠️  No devices found. Please register some IoT devices first.');
        return;
      }

      // Filter for anomalies (speeds > threshold)
      const anomalies = csvData.filter(point => 
        point.speed_kmh > this.speedThreshold && 
        !isNaN(point.speed_kmh) && 
        point.speed_kmh > 0
      );

      console.log(`🔍 Found ${anomalies.length} anomalies (speeds > ${this.speedThreshold} km/h)`);

      if (anomalies.length === 0) {
        console.log('ℹ️  No anomalies found in CSV data.');
        return;
      }

      // Import incidents (distribute across available devices)
      let deviceIndex = 0;
      const batchSize = 50;
      
      for (let i = 0; i < anomalies.length; i += batchSize) {
        const batch = anomalies.slice(i, i + batchSize);
        
        console.log(`📝 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(anomalies.length/batchSize)}...`);
        
        for (const anomaly of batch) {
          // Rotate through available devices
          const device = devices[deviceIndex % devices.length];
          deviceIndex++;

          const incident = await this.createIncidentRecord(anomaly, device);
          if (incident) {
            if (this.importedCount % 100 === 0) {
              console.log(`✅ Imported ${this.importedCount} incidents...`);
            }
          }
        }

        // Small delay between batches to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🎉 Import completed! Created ${this.importedCount} historical incidents.`);
      
      // Show summary statistics
      await this.showImportSummary();

    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  // Show summary of imported incidents
  async showImportSummary() {
    try {
      const stats = await db.pool.query(`
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(CASE WHEN severity_level = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN severity_level = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN severity_level = 'medium' THEN 1 END) as medium,
          COUNT(CASE WHEN severity_level = 'low' THEN 1 END) as low,
          MIN(incident_timestamp) as earliest_incident,
          MAX(incident_timestamp) as latest_incident
        FROM incident_alerts
      `);

      const summary = stats.rows[0];
      
      console.log('\n📊 IMPORT SUMMARY:');
      console.log(`Total Incidents: ${summary.total_incidents}`);
      console.log(`Critical: ${summary.critical}`);
      console.log(`High: ${summary.high}`);
      console.log(`Medium: ${summary.medium}`);
      console.log(`Low: ${summary.low}`);
      console.log(`Date Range: ${summary.earliest_incident} to ${summary.latest_incident}`);
      
    } catch (error) {
      console.error('❌ Error generating summary:', error);
    }
  }
}

// Run the import if this script is executed directly
async function main() {
  const importer = new HistoricalIncidentImporter();
  
  try {
    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    await importer.importHistoricalIncidents();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.pool.end();
    console.log('👋 Database connection closed.');
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default HistoricalIncidentImporter;
