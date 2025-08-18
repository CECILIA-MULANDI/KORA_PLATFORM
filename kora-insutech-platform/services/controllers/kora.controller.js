import db from "../databases/db_connection.js";
import IoTDataReader from "../iot-simulation/dataReader.js";

class KoraController {
  constructor() {
    this.dataReader = new IoTDataReader();
  }

  // KORA Dashboard Overview - System-wide statistics
  async getDashboardOverview(req, res) {
    try {
      // Get system-wide statistics
      const [
        companiesResult,
        devicesResult,
        policiesResult,
        incidentsResult,
        activeDevicesResult,
      ] = await Promise.all([
        // Total insurance companies
        db.pool.query(
          "SELECT COUNT(*) as total FROM insurance_company WHERE blockchain_registered = true"
        ),

        // Total IoT devices
        db.pool.query(
          "SELECT COUNT(*) as total FROM iot_devices WHERE blockchain_registered = true"
        ),

        // Total policies with blockchain hashes
        db.pool.query(
          "SELECT COUNT(*) as total FROM policies WHERE blockchain_registered = true"
        ),

        // Total incidents detected
        db.pool.query("SELECT COUNT(*) as total FROM incident_alerts"),

        // Active devices (with policies)
        db.pool.query(`
          SELECT COUNT(*) as total 
          FROM iot_devices d 
          JOIN policies p ON d.policy_id = p.id 
          WHERE d.blockchain_registered = true
        `),
      ]);

      // Get CSV data statistics
      const csvStats = this.dataReader.getDataStats();

      res.json({
        message: "KORA System Overview",
        system_stats: {
          insurance_companies: parseInt(companiesResult.rows[0].total),
          iot_devices_registered: parseInt(devicesResult.rows[0].total),
          policies_with_blockchain: parseInt(policiesResult.rows[0].total),
          total_incidents: parseInt(incidentsResult.rows[0].total),
          active_monitored_devices: parseInt(activeDevicesResult.rows[0].total),
        },
        data_source: {
          csv_data_points: csvStats.totalPoints,
          max_speed_recorded: csvStats.maxSpeed,
          anomalies_in_dataset: csvStats.anomalyCount,
          anomaly_percentage: csvStats.anomalyPercentage,
        },
        transparency_metrics: {
          blockchain_verified_companies: parseInt(
            companiesResult.rows[0].total
          ),
          immutable_incident_records: parseInt(incidentsResult.rows[0].total),
          policy_integrity_hashes: parseInt(policiesResult.rows[0].total),
        },
      });
    } catch (error) {
      console.error("Error getting KORA dashboard overview:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Real-time device monitoring across all companies
  async getDeviceMonitoring(req, res) {
    try {
      const devicesQuery = await db.pool.query(`
        SELECT 
          d.device_id,
          d.device_type,
          d.device_status,
          d.blockchain_registered,
          d.blockchain_tx_hash,
          d.last_ping,
          p.policy_number,
          p.policy_holder_name,
          p.policy_type,
          ic.name as company_name,
          ic.kora_insurer_id,
          -- Get latest incident if any
          (SELECT COUNT(*) FROM incident_alerts i WHERE i.device_id = d.id) as incident_count,
          (SELECT MAX(incident_timestamp) FROM incident_alerts i WHERE i.device_id = d.id) as last_incident
        FROM iot_devices d
        LEFT JOIN policies p ON d.policy_id = p.id
        LEFT JOIN insurance_company ic ON p.insurance_company_id = ic.id
        WHERE d.blockchain_registered = true
        ORDER BY d.created_at DESC
      `);

      const devices = devicesQuery.rows.map((device) => ({
        device_id: device.device_id,
        device_type: device.device_type,
        status: device.device_status,
        blockchain_verified: device.blockchain_registered,
        blockchain_tx: device.blockchain_tx_hash,
        last_ping: device.last_ping,
        policy_info: device.policy_number
          ? {
              policy_number: device.policy_number,
              policy_holder: device.policy_holder_name,
              policy_type: device.policy_type,
            }
          : null,
        insurance_company: {
          name: device.company_name,
          kora_id: device.kora_insurer_id,
        },
        incident_summary: {
          total_incidents: parseInt(device.incident_count),
          last_incident: device.last_incident,
        },
      }));

      res.json({
        message: "KORA Device Monitoring",
        total_devices: devices.length,
        devices: devices,
        monitoring_status: "active",
      });
    } catch (error) {
      console.error("Error getting device monitoring:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Real-time incident monitoring (anomalies detected)
  async getIncidentMonitoring(req, res) {
    const { limit = 50, severity } = req.query;

    try {
      let query = `
        SELECT
          i.incident_id,
          i.incident_type,
          i.severity_level,
          i.incident_timestamp,
          i.incident_location,
          i.sensor_data,
          i.blockchain_tx_hash,
          i.blockchain_status,
          i.blockchain_recorded_at,
          i.created_at,
          d.device_id,
          p.policy_number,
          p.policy_holder_name,
          ic.name as company_name,
          ic.kora_insurer_id
        FROM incident_alerts i
        JOIN iot_devices d ON i.device_id = d.id
        LEFT JOIN policies p ON i.policy_id = p.id
        LEFT JOIN insurance_company ic ON p.insurance_company_id = ic.id
      `;

      const params = [];
      if (severity) {
        query += ` WHERE i.severity_level = $1`;
        params.push(severity);
        query += ` ORDER BY i.created_at DESC LIMIT $2`;
        params.push(parseInt(limit));
      } else {
        query += ` ORDER BY i.created_at DESC LIMIT $1`;
        params.push(parseInt(limit));
      }

      const incidentsResult = await db.pool.query(query, params);

      const incidents = incidentsResult.rows.map((incident) => ({
        incident_id: incident.incident_id,
        incident_type: incident.incident_type,
        severity: incident.severity_level,
        timestamp: incident.incident_timestamp,
        location: incident.incident_location,
        incident_details: incident.sensor_data,
        blockchain_proof: incident.blockchain_tx_hash,
        blockchain_status: incident.blockchain_status, // 'pending', 'confirmed', 'failed'
        blockchain_recorded_at: incident.blockchain_recorded_at,
        device_info: {
          device_id: incident.device_id,
        },
        policy_info: incident.policy_number
          ? {
              policy_number: incident.policy_number,
              policy_holder: incident.policy_holder_name,
            }
          : null,
        insurance_company: {
          name: incident.company_name,
          kora_id: incident.kora_insurer_id,
        },
        transparency_status: {
          blockchain_recorded: !!incident.blockchain_tx_hash,
          blockchain_status: incident.blockchain_status,
          company_notified: true, // Always true when incident is created
          kora_verified: true,
          real_time_recorded: true, // Incidents are now recorded immediately
        },
        detected_at: incident.created_at,
      }));

      // Get severity breakdown
      const severityStats = await db.pool.query(`
        SELECT severity_level, COUNT(*) as count
        FROM incident_alerts
        GROUP BY severity_level
        ORDER BY 
          CASE severity_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `);

      res.json({
        message: "KORA Incident Monitoring",
        total_incidents: incidents.length,
        incidents: incidents,
        severity_breakdown: severityStats.rows.reduce((acc, row) => {
          acc[row.severity_level] = parseInt(row.count);
          return acc;
        }, {}),
        transparency_note:
          "All incidents are immutably recorded and insurance companies cannot hide them",
      });
    } catch (error) {
      console.error("Error getting incident monitoring:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Insurance company transparency report
  async getCompanyTransparency(req, res) {
    try {
      const companiesQuery = await db.pool.query(`
        SELECT
          ic.name as company_name,
          ic.kora_insurer_id,
          ic.blockchain_registered,
          ic.blockchain_tx_hash,
          -- Device counts
          (SELECT COUNT(*) FROM iot_devices d 
           JOIN policies p ON d.policy_id = p.id 
           WHERE p.insurance_company_id = ic.id) as total_devices,
          -- Policy counts
          (SELECT COUNT(*) FROM policies p WHERE p.insurance_company_id = ic.id) as total_policies,
          (SELECT COUNT(*) FROM policies p WHERE p.insurance_company_id = ic.id AND p.blockchain_registered = true) as blockchain_policies,
          -- Incident counts
          (SELECT COUNT(*) FROM incident_alerts i
           JOIN iot_devices d ON i.device_id = d.id
           JOIN policies p ON d.policy_id = p.id
           WHERE p.insurance_company_id = ic.id) as total_incidents,
          -- Recent incident
          (SELECT MAX(i.created_at) FROM incident_alerts i
           JOIN iot_devices d ON i.device_id = d.id
           JOIN policies p ON d.policy_id = p.id
           WHERE p.insurance_company_id = ic.id) as last_incident_date
        FROM insurance_company ic
        WHERE ic.blockchain_registered = true
        ORDER BY ic.created_at DESC
      `);

      const companies = companiesQuery.rows.map((company) => ({
        company_name: company.company_name,
        kora_id: company.kora_insurer_id,
        blockchain_verified: company.blockchain_registered,
        blockchain_tx: company.blockchain_tx_hash,
        transparency_metrics: {
          total_devices_monitored: parseInt(company.total_devices),
          total_policies: parseInt(company.total_policies),
          policies_with_blockchain_hash: parseInt(company.blockchain_policies),
          total_incidents_detected: parseInt(company.total_incidents),
          last_incident: company.last_incident_date,
        },
        transparency_score: {
          blockchain_integration: company.blockchain_registered ? 100 : 0,
          policy_transparency:
            company.total_policies > 0
              ? Math.round(
                  (company.blockchain_policies / company.total_policies) * 100
                )
              : 0,
          incident_transparency: 100, // All incidents are automatically transparent via KORA
        },
      }));

      res.json({
        message: "Insurance Company Transparency Report",
        total_companies: companies.length,
        companies: companies,
        kora_value_proposition:
          "KORA ensures no insurance company can hide IoT-detected incidents",
      });
    } catch (error) {
      console.error("Error getting company transparency:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Live data stream status (which devices are currently being monitored)
  async getLiveDataStatus(req, res) {
    try {
      // This would integrate with your simulation controller to show active streams
      // For now, we'll show devices that have recent activity

      const recentActivityQuery = await db.pool.query(`
        SELECT 
          d.device_id,
          d.device_type,
          p.policy_number,
          p.policy_holder_name,
          ic.name as company_name,
          d.last_ping,
          -- Check if device has recent incidents (last 24 hours)
          (SELECT COUNT(*) FROM incident_alerts i
           WHERE i.device_id = d.id
           AND i.created_at > NOW() - INTERVAL '24 hours') as recent_incidents
        FROM iot_devices d
        LEFT JOIN policies p ON d.policy_id = p.id
        LEFT JOIN insurance_company ic ON p.insurance_company_id = ic.id
        WHERE d.blockchain_registered = true
        ORDER BY d.last_ping DESC NULLS LAST
        LIMIT 20
      `);

      const liveDevices = recentActivityQuery.rows.map((device) => ({
        device_id: device.device_id,
        device_type: device.device_type,
        policy_number: device.policy_number,
        policy_holder: device.policy_holder_name,
        insurance_company: device.company_name,
        last_ping: device.last_ping,
        recent_incidents: parseInt(device.recent_incidents),
        monitoring_status: device.last_ping ? "active" : "inactive",
      }));

      res.json({
        message: "Live IoT Data Monitoring Status",
        active_monitoring: liveDevices,
        total_monitored_devices: liveDevices.length,
        data_source: "Real-time CSV simulation + Database records",
      });
    } catch (error) {
      console.error("Error getting live data status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default KoraController;
