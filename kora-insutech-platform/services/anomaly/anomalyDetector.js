import { ethers } from "ethers";
import db from "../databases/db_connection.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnomalyDetector {
  constructor() {
    this.speedThreshold = 180; // km/h
    this.setupBlockchain();
  }

  // Setup blockchain connection
  setupBlockchain() {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const abiPath = path.join(__dirname, "../blockchainservices/abi.json");
      const abi = JSON.parse(readFileSync(abiPath, "utf8"));

      this.contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        abi,
        wallet
      );

      console.log("🔗 Anomaly detector connected to blockchain");
    } catch (error) {
      console.error("❌ Blockchain setup failed:", error.message);
    }
  }

  // Main anomaly detection function
  async detectAnomaly(iotData) {
    const { deviceId, speed_kmh, timestamp, location } = iotData;

    // Update device last ping time (for live monitoring)
    await this.updateDeviceLastPing(deviceId, timestamp);

    // Check if speed exceeds threshold
    if (speed_kmh > this.speedThreshold) {
      console.log(
        `🚨 ANOMALY DETECTED: Device ${deviceId} - Speed: ${speed_kmh} km/h`
      );

      const anomaly = {
        deviceId: deviceId,
        incidentType: "speeding",
        severity: this.calculateSeverity(speed_kmh),
        timestamp: timestamp,
        location: location,
        speed: speed_kmh,
        threshold: this.speedThreshold,
      };

      // Process the anomaly
      await this.processAnomaly(anomaly);
      return anomaly;
    }

    return null; // No anomaly detected
  }

  // Calculate severity based on speed
  calculateSeverity(speed) {
    if (speed > 300) return "critical";
    if (speed > 250) return "high";
    if (speed > 200) return "medium";
    return "low";
  }

  // Process detected anomaly - HYBRID APPROACH for real-time + blockchain
  async processAnomaly(anomaly) {
    try {
      // 1. IMMEDIATE: Save to database (0.1s)
      console.log(
        `⚡ IMMEDIATE: Saving anomaly to database for device: ${anomaly.deviceId}`
      );
      const dbResult = await this.saveAnomalyToDatabase(anomaly);

      // 2. IMMEDIATE: Send real-time alert to dashboards (0.1s)
      console.log(
        `⚡ IMMEDIATE: Sending real-time alert for device: ${anomaly.deviceId}`
      );
      await this.sendImmediateAlert(anomaly, dbResult);

      // 3. ASYNC: Record on blockchain in background (3-6s)
      console.log(
        `🔗 ASYNC: Starting blockchain recording for device: ${anomaly.deviceId}`
      );
      this.recordAnomalyOnBlockchainAsync(anomaly, dbResult.incident.id);

      console.log(
        `✅ Anomaly processed immediately for device: ${anomaly.deviceId} (blockchain recording in progress)`
      );
    } catch (error) {
      console.error(`❌ Error processing anomaly:`, error.message);
    }
  }

  // Save anomaly to database
  async saveAnomalyToDatabase(anomaly) {
    try {
      // Get device and policy information
      const deviceQuery = await db.pool.query(
        `SELECT d.*, p.policy_number, p.policy_holder_name, p.insurance_company_id, ic.company_name
         FROM iot_devices d
         LEFT JOIN policies p ON d.policy_id = p.id
         LEFT JOIN insurance_company ic ON p.insurance_company_id = ic.id
         WHERE d.device_id = $1`,
        [anomaly.deviceId]
      );

      if (deviceQuery.rows.length === 0) {
        throw new Error(`Device ${anomaly.deviceId} not found in database`);
      }

      const device = deviceQuery.rows[0];

      // Insert anomaly record with blockchain status tracking
      const result = await db.pool.query(
        `INSERT INTO incident_alerts (
          incident_id, device_id, policy_id, incident_type, severity_level,
          incident_timestamp, incident_location, sensor_data,
          blockchain_tx_hash, blockchain_status, kora_notified, insurance_notified,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          `INC-${Date.now()}-${anomaly.deviceId}`,
          device.id, // database device ID
          device.policy_id,
          anomaly.incidentType,
          anomaly.severity,
          new Date(anomaly.timestamp * 1000), // Convert Unix timestamp
          JSON.stringify(anomaly.location),
          JSON.stringify({
            speed_kmh: anomaly.speed,
            threshold: anomaly.threshold,
            excess_speed: anomaly.speed - anomaly.threshold,
          }),
          null, // Will be updated after blockchain transaction
          "pending", // blockchain_status starts as pending
          true, // kora_notified - KORA is immediately notified
          true, // insurance_notified - company is immediately notified
        ]
      );

      return {
        success: true,
        incident: result.rows[0],
        device: device,
      };
    } catch (error) {
      console.error("❌ Database save failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Record anomaly on blockchain - IMPLEMENTED
  async recordAnomalyOnBlockchain(anomaly) {
    try {
      // Create hash of anomaly data for blockchain
      const anomalyDataString = JSON.stringify({
        deviceId: anomaly.deviceId,
        incidentType: anomaly.incidentType,
        timestamp: anomaly.timestamp,
        speed: anomaly.speed,
        location: anomaly.location,
      });

      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(anomalyDataString));
      const incidentId = `INC-${Date.now()}-${anomaly.deviceId}`;

      console.log(`📝 Recording incident on blockchain: ${incidentId}`);
      console.log(`📝 Anomaly data hash: ${dataHash}`);

      // Call smart contract function to record incident
      const tx = await this.contract.recordIncident(
        incidentId,
        anomaly.deviceId,
        anomaly.incidentType,
        anomaly.severity,
        dataHash
      );

      console.log(`📝 Transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      await tx.wait();
      console.log(`✅ Transaction confirmed: ${tx.hash}`);

      return {
        success: true,
        txHash: tx.hash,
        dataHash: dataHash,
        incidentId: incidentId,
        message: "Incident successfully recorded on blockchain",
      };
    } catch (error) {
      console.error("❌ Blockchain recording failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Update device last ping time for live monitoring
  async updateDeviceLastPing(deviceId, timestamp) {
    try {
      await db.pool.query(
        "UPDATE iot_devices SET last_ping = $1 WHERE device_id = $2",
        [new Date(timestamp * 1000), deviceId]
      );
    } catch (error) {
      console.error("❌ Failed to update device last ping:", error.message);
    }
  }

  // Send immediate alert to dashboards (real-time)
  async sendImmediateAlert(anomaly, dbResult) {
    try {
      const alertData = {
        type: "anomaly_detected",
        deviceId: anomaly.deviceId,
        incidentType: anomaly.incidentType,
        severity: anomaly.severity,
        speed: anomaly.speed,
        timestamp: anomaly.timestamp,
        location: anomaly.location,
        policyHolder: dbResult.device?.policy_holder_name,
        insuranceCompany: dbResult.device?.company_name,
        blockchainStatus: "pending", // Blockchain recording in progress
        incidentId: dbResult.incident.incident_id,
      };

      // Log immediate alert
      console.log("⚡ IMMEDIATE ALERT SENT TO DASHBOARDS:");
      console.log("📱 Insurance Company Dashboard:", {
        message: `IMMEDIATE: Speeding detected: ${anomaly.speed} km/h`,
        customer: dbResult.device?.policy_holder_name,
        device: anomaly.deviceId,
        severity: anomaly.severity,
        status: "⏳ Blockchain recording in progress",
      });

      console.log("📱 KORA Dashboard:", {
        message: `IMMEDIATE: Anomaly detected and recorded`,
        company: dbResult.device?.company_name,
        device: anomaly.deviceId,
        status: "⏳ Blockchain recording in progress",
      });

      return { success: true, alertData };
    } catch (error) {
      console.error("❌ Immediate alert sending failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Record anomaly on blockchain asynchronously
  async recordAnomalyOnBlockchainAsync(anomaly, incidentDbId) {
    try {
      console.log(
        `🔗 Starting async blockchain recording for incident ID: ${incidentDbId}`
      );

      // Record on blockchain
      const blockchainResult = await this.recordAnomalyOnBlockchain(anomaly);

      if (blockchainResult.success) {
        // Update database with blockchain proof
        await this.updateIncidentWithBlockchainProof(
          incidentDbId,
          blockchainResult.txHash
        );

        // Send blockchain confirmation alert
        await this.sendBlockchainConfirmation(
          anomaly,
          blockchainResult,
          incidentDbId
        );

        console.log(
          `✅ Blockchain recording completed for incident ID: ${incidentDbId}`
        );
      } else {
        // Mark as failed in database
        await this.markBlockchainRecordingFailed(
          incidentDbId,
          blockchainResult.error
        );
        console.error(
          `❌ Blockchain recording failed for incident ID: ${incidentDbId}`
        );
      }
    } catch (error) {
      console.error(`❌ Async blockchain recording error:`, error.message);
      await this.markBlockchainRecordingFailed(incidentDbId, error.message);
    }
  }

  // Update incident record with blockchain proof
  async updateIncidentWithBlockchainProof(incidentDbId, txHash) {
    try {
      await db.pool.query(
        `UPDATE incident_alerts
         SET blockchain_tx_hash = $1,
             blockchain_status = 'confirmed',
             blockchain_registered = true,
             blockchain_recorded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [txHash, incidentDbId]
      );
      console.log(`✅ Database updated with blockchain proof: ${txHash}`);
    } catch (error) {
      console.error(
        "❌ Failed to update database with blockchain proof:",
        error.message
      );
    }
  }

  // Mark blockchain recording as failed
  async markBlockchainRecordingFailed(incidentDbId, errorMessage) {
    try {
      await db.pool.query(
        `UPDATE incident_alerts
         SET blockchain_status = 'failed',
             resolution_notes = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [`Blockchain recording failed: ${errorMessage}`, incidentDbId]
      );
      console.log(
        `❌ Marked blockchain recording as failed for incident ID: ${incidentDbId}`
      );
    } catch (error) {
      console.error(
        "❌ Failed to mark blockchain recording as failed:",
        error.message
      );
    }
  }

  // Send blockchain confirmation alert
  async sendBlockchainConfirmation(anomaly, blockchainResult, incidentDbId) {
    try {
      console.log("⛓️ BLOCKCHAIN CONFIRMATION SENT TO DASHBOARDS:");
      console.log("📱 Insurance Company Dashboard:", {
        message: `Blockchain confirmed: Incident immutably recorded`,
        device: anomaly.deviceId,
        txHash: blockchainResult.txHash,
        status: "✅ Blockchain confirmed",
      });

      console.log("📱 KORA Dashboard:", {
        message: `Transparency confirmed: Incident on blockchain`,
        device: anomaly.deviceId,
        txHash: blockchainResult.txHash,
        status: "✅ Blockchain confirmed",
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Blockchain confirmation alert failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Legacy method - keeping for backward compatibility
  async sendAlerts(anomaly, dbResult, blockchainResult) {
    try {
      const alertData = {
        type: "anomaly_detected",
        deviceId: anomaly.deviceId,
        incidentType: anomaly.incidentType,
        severity: anomaly.severity,
        speed: anomaly.speed,
        timestamp: anomaly.timestamp,
        location: anomaly.location,
        policyHolder: dbResult.device?.policy_holder_name,
        insuranceCompany: dbResult.device?.company_name,
        blockchainTxHash: blockchainResult.txHash,
      };

      // Log alert (in real implementation, this would send to dashboards)
      console.log("🚨 ALERT SENT TO DASHBOARDS:");
      console.log("📱 Insurance Company Dashboard:", {
        message: `Speeding detected: ${anomaly.speed} km/h`,
        customer: dbResult.device?.policy_holder_name,
        device: anomaly.deviceId,
        severity: anomaly.severity,
      });

      console.log("📱 KORA Dashboard:", {
        message: `Anomaly transparency: Insurance company notified`,
        company: dbResult.device?.company_name,
        device: anomaly.deviceId,
        blockchainProof: blockchainResult.txHash,
      });

      return { success: true, alertData };
    } catch (error) {
      console.error("❌ Alert sending failed:", error.message);
      return { success: false, error: error.message };
    }
  }
}

export default AnomalyDetector;
