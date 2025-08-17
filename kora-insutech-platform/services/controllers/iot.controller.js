import db from "../databases/db_connection.js";
import { v4 as uuidv4 } from "uuid";
import { registerIoTDeviceOnChain } from "../blockchainservices/registerOnChain.js";

class IoTController {
  // Register IoT device with just serial number and optionally link to policy
  async registerDevice(req, res) {
    const { serial_number, policy_id } = req.body;
    const insurance_company_id = req.user.id;

    try {
      if (!serial_number) {
        return res.status(400).json({
          error: "Serial number is required",
        });
      }

      // Check if device already exists
      const existingDevice = await db.pool.query(
        "SELECT * FROM iot_devices WHERE device_id = $1",
        [serial_number]
      );

      if (existingDevice.rows.length > 0) {
        return res.status(409).json({
          error: "Device with this serial number already exists",
        });
      }

      // If policy_id is provided, verify it belongs to this insurance company
      let policyInfo = null;
      if (policy_id) {
        const policyCheck = await db.pool.query(
          "SELECT id, policy_number, policy_holder_name, policy_type FROM policies WHERE id = $1 AND insurance_company_id = $2",
          [policy_id, insurance_company_id]
        );

        if (policyCheck.rows.length === 0) {
          return res.status(404).json({
            error: "Policy not found or doesn't belong to your company",
          });
        }
        policyInfo = policyCheck.rows[0];
      }

      const koraDeviceId = uuidv4();

      // Insert new IoT device with simplified fields
      const result = await db.pool.query(
        `INSERT INTO iot_devices (
          device_id, device_type, kora_device_id, policy_id, assigned_date
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          serial_number,
          "tracker", // Default type
          koraDeviceId,
          policy_id || null,
          policy_id ? new Date() : null,
        ]
      );

      const newDevice = result.rows[0];

      // Register device on blockchain
      console.log(
        "🔗 Starting blockchain registration for IoT device:",
        serial_number
      );
      const onChainResult = await registerIoTDeviceOnChain(
        serial_number,
        policy_id || ""
      );

      if (onChainResult.success) {
        await db.pool.query(
          "UPDATE iot_devices SET blockchain_registered = TRUE, blockchain_tx_hash = $1 WHERE kora_device_id = $2",
          [onChainResult.txHash, koraDeviceId]
        );
      }

      const response = {
        message: policy_id
          ? `IoT device registered and linked to policy ${policyInfo.policy_number}`
          : "IoT device registered successfully",
        device: newDevice,
        blockchain_registered: onChainResult.success,
      };

      if (policyInfo) {
        response.linked_policy = policyInfo;
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("Error registering IoT device:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get all devices for an insurance company (both assigned and unassigned)
  async getDevices(req, res) {
    const insurance_company_id = req.user.id;

    try {
      const result = await db.pool.query(
        `SELECT 
          d.*,
          p.policy_number,
          p.policy_holder_name,
          p.policy_type
         FROM iot_devices d
         LEFT JOIN policies p ON d.policy_id = p.id
         WHERE p.insurance_company_id = $1 OR d.policy_id IS NULL
         ORDER BY d.created_at DESC`,
        [insurance_company_id]
      );

      res.json({
        devices: result.rows,
      });
    } catch (error) {
      console.error("Error fetching IoT devices:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Link IoT device to a specific policy
  async linkDeviceToPolicy(req, res) {
    const { device_id, policy_id } = req.body;
    const insurance_company_id = req.user.id;

    try {
      if (!device_id || !policy_id) {
        return res.status(400).json({
          error: "Device ID and Policy ID are required",
        });
      }

      // Verify policy belongs to this insurance company
      const policyCheck = await db.pool.query(
        "SELECT id, policy_number, policy_holder_name FROM policies WHERE id = $1 AND insurance_company_id = $2",
        [policy_id, insurance_company_id]
      );

      if (policyCheck.rows.length === 0) {
        return res.status(404).json({
          error: "Policy not found or doesn't belong to your company",
        });
      }

      const policy = policyCheck.rows[0];

      // Check if device exists and is not already assigned
      const deviceCheck = await db.pool.query(
        "SELECT * FROM iot_devices WHERE device_id = $1",
        [device_id]
      );

      if (deviceCheck.rows.length === 0) {
        return res.status(404).json({ error: "IoT device not found" });
      }

      const device = deviceCheck.rows[0];

      if (device.policy_id) {
        return res.status(400).json({
          error: "Device is already assigned to another policy",
        });
      }

      // Link device to policy
      const result = await db.pool.query(
        `UPDATE iot_devices 
         SET policy_id = $1, assigned_date = CURRENT_TIMESTAMP
         WHERE device_id = $2
         RETURNING *`,
        [policy_id, device_id]
      );

      console.log(
        `🔗 IoT Device ${device_id} linked to Policy ${policy.policy_number}`
      );

      res.json({
        message: "IoT device successfully linked to policy",
        device: result.rows[0],
        policy: policy,
        link_details: {
          device_id: device_id,
          policy_number: policy.policy_number,
          policy_holder: policy.policy_holder_name,
          linked_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error linking device to policy:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Unlink IoT device from policy
  async unlinkDeviceFromPolicy(req, res) {
    const { deviceId } = req.params;
    const device_id = deviceId; // Match route parameter name
    const insurance_company_id = req.user.id;

    try {
      // Verify device is linked to a policy owned by this company
      const deviceCheck = await db.pool.query(
        `SELECT d.*, p.insurance_company_id, p.policy_number 
         FROM iot_devices d
         LEFT JOIN policies p ON d.policy_id = p.id
         WHERE d.device_id = $1`,
        [device_id]
      );

      if (deviceCheck.rows.length === 0) {
        return res.status(404).json({ error: "Device not found" });
      }

      const device = deviceCheck.rows[0];

      if (!device.policy_id) {
        return res
          .status(400)
          .json({ error: "Device is not linked to any policy" });
      }

      if (device.insurance_company_id !== insurance_company_id) {
        return res
          .status(403)
          .json({ error: "Device is not linked to your company's policy" });
      }

      // Unlink device from policy
      const result = await db.pool.query(
        `UPDATE iot_devices 
         SET policy_id = NULL, assigned_date = NULL
         WHERE device_id = $1
         RETURNING *`,
        [device_id]
      );

      console.log(
        `🔓 IoT Device ${device_id} unlinked from Policy ${device.policy_number}`
      );

      res.json({
        message: "IoT device successfully unlinked from policy",
        device: result.rows[0],
      });
    } catch (error) {
      console.error("Error unlinking device from policy:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get all policies available for linking (for dropdown)
  async getAvailablePolicies(req, res) {
    const insurance_company_id = req.user.id;

    try {
      const result = await db.pool.query(
        `SELECT id, policy_number, policy_holder_name, policy_type, coverage_amount
         FROM policies 
         WHERE insurance_company_id = $1
         ORDER BY policy_number ASC`,
        [insurance_company_id]
      );

      res.json({
        policies: result.rows,
      });
    } catch (error) {
      console.error("Error fetching available policies:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get device details by ID
  async getDeviceById(req, res) {
    const { deviceId } = req.params;

    try {
      const result = await db.pool.query(
        `SELECT 
          d.*,
          p.policy_number,
          p.policy_holder_name,
          p.policy_type,
          p.coverage_amount
         FROM iot_devices d
         LEFT JOIN policies p ON d.policy_id = p.id
         WHERE d.device_id = $1`,
        [deviceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Device not found" });
      }

      res.json({
        device: result.rows[0],
      });
    } catch (error) {
      console.error("Error fetching device:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Update device status
  async updateDeviceStatus(req, res) {
    const { deviceId } = req.params;
    const { device_status } = req.body;

    try {
      const result = await db.pool.query(
        `UPDATE iot_devices 
         SET device_status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE device_id = $2
         RETURNING *`,
        [device_status, deviceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Device not found" });
      }

      res.json({
        message: "Device status updated successfully",
        device: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating device status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new IoTController();
