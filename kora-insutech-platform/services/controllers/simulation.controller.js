import IoTDataReader from '../iot-simulation/dataReader.js';
import AnomalyDetector from '../anomaly/anomalyDetector.js';
import db from '../databases/db_connection.js';

class SimulationController {
  constructor() {
    this.dataReader = new IoTDataReader();
    this.anomalyDetector = new AnomalyDetector();
    this.activeStreams = new Map(); // Track active data streams
  }

  // Get CSV data statistics
  async getDataStats(req, res) {
    try {
      const stats = this.dataReader.getDataStats();
      const anomalies = this.dataReader.getAllAnomalies();
      
      res.json({
        message: "IoT data statistics",
        stats: stats,
        sample_anomalies: anomalies.slice(0, 5).map(point => ({
          timestamp: new Date(point.timestamp * 1000).toISOString(),
          speed_kmh: point.speed_kmh,
          location: {
            latitude: point.latitude,
            longitude: point.longitude
          }
        }))
      });
    } catch (error) {
      console.error("Error getting data stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Start IoT data simulation for a specific device
  async startDeviceSimulation(req, res) {
    const { deviceId } = req.params;
    const { intervalMs = 5000 } = req.body; // Default 5 seconds
    const insurance_company_id = req.user.id;

    try {
      // Verify device belongs to this insurance company
      const deviceCheck = await db.pool.query(
        `SELECT d.*, p.policy_number, p.policy_holder_name 
         FROM iot_devices d
         LEFT JOIN policies p ON d.policy_id = p.id
         WHERE d.device_id = $1 AND (p.insurance_company_id = $2 OR d.policy_id IS NULL)`,
        [deviceId, insurance_company_id]
      );

      if (deviceCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: "Device not found or doesn't belong to your company" 
        });
      }

      // Stop existing stream if running
      if (this.activeStreams.has(deviceId)) {
        clearInterval(this.activeStreams.get(deviceId));
      }

      // Start new data stream
      const streamInterval = this.dataReader.startDataStream(
        deviceId, 
        intervalMs, 
        async (iotData) => {
          console.log(`📊 Device ${deviceId} data:`, {
            speed: iotData.speed_kmh,
            location: iotData.location,
            timestamp: new Date(iotData.timestamp * 1000).toISOString()
          });

          // Check for anomalies
          const anomaly = await this.anomalyDetector.detectAnomaly(iotData);
          
          if (anomaly) {
            console.log(`🚨 Anomaly processed for device ${deviceId}`);
          }
        }
      );

      // Store stream reference
      this.activeStreams.set(deviceId, streamInterval);

      res.json({
        message: `IoT simulation started for device ${deviceId}`,
        deviceId: deviceId,
        intervalMs: intervalMs,
        device_info: deviceCheck.rows[0]
      });

    } catch (error) {
      console.error("Error starting device simulation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Stop IoT data simulation for a specific device
  async stopDeviceSimulation(req, res) {
    const { deviceId } = req.params;

    try {
      if (this.activeStreams.has(deviceId)) {
        clearInterval(this.activeStreams.get(deviceId));
        this.activeStreams.delete(deviceId);
        
        res.json({
          message: `IoT simulation stopped for device ${deviceId}`,
          deviceId: deviceId
        });
      } else {
        res.status(404).json({
          error: `No active simulation found for device ${deviceId}`
        });
      }
    } catch (error) {
      console.error("Error stopping device simulation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get single data point for testing
  async getTestDataPoint(req, res) {
    const { deviceId } = req.params;
    const insurance_company_id = req.user.id;

    try {
      // Verify device belongs to this insurance company
      const deviceCheck = await db.pool.query(
        `SELECT d.*, p.policy_number, p.policy_holder_name 
         FROM iot_devices d
         LEFT JOIN policies p ON d.policy_id = p.id
         WHERE d.device_id = $1 AND (p.insurance_company_id = $2 OR d.policy_id IS NULL)`,
        [deviceId, insurance_company_id]
      );

      if (deviceCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: "Device not found or doesn't belong to your company" 
        });
      }

      // Get random data point
      const iotData = this.dataReader.getRandomDataPoint(deviceId);
      
      // Check for anomaly
      const anomaly = await this.anomalyDetector.detectAnomaly(iotData);

      res.json({
        message: "Test data point generated",
        deviceId: deviceId,
        data: {
          timestamp: new Date(iotData.timestamp * 1000).toISOString(),
          speed_kmh: iotData.speed_kmh,
          location: iotData.location,
          anomaly_detected: !!anomaly,
          anomaly_details: anomaly
        },
        device_info: deviceCheck.rows[0]
      });

    } catch (error) {
      console.error("Error getting test data point:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get list of active simulations
  async getActiveSimulations(req, res) {
    try {
      const activeDevices = Array.from(this.activeStreams.keys());
      
      res.json({
        message: "Active IoT simulations",
        active_devices: activeDevices,
        total_active: activeDevices.length
      });
    } catch (error) {
      console.error("Error getting active simulations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get recent incidents/anomalies
  async getRecentIncidents(req, res) {
    const insurance_company_id = req.user.id;

    try {
      const incidents = await db.pool.query(
        `SELECT i.*, d.device_id, p.policy_number, p.policy_holder_name
         FROM iot_incidents i
         JOIN iot_devices d ON i.device_id = d.id
         LEFT JOIN policies p ON i.policy_id = p.id
         WHERE p.insurance_company_id = $1
         ORDER BY i.created_at DESC
         LIMIT 20`,
        [insurance_company_id]
      );

      res.json({
        message: "Recent IoT incidents",
        incidents: incidents.rows.map(incident => ({
          incident_id: incident.incident_id,
          device_id: incident.device_id,
          policy_number: incident.policy_number,
          policy_holder: incident.policy_holder_name,
          incident_type: incident.incident_type,
          severity: incident.severity_level,
          timestamp: incident.incident_timestamp,
          location: incident.location_data,
          data: incident.incident_data,
          blockchain_tx: incident.blockchain_tx_hash,
          created_at: incident.created_at
        }))
      });

    } catch (error) {
      console.error("Error getting recent incidents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default SimulationController;
