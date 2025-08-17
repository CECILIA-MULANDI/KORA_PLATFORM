import db from "../databases/db_connection.js";
import { v4 as uuidv4 } from "uuid";
import policyExtractionService from "../services/policyExtraction.service.js";
import {
  getFileInfo,
  deleteUploadedFile,
} from "../middleware/upload.middleware.js";
import { registerPolicyHashOnChain } from "../blockchainservices/registerOnChain.js";
import { readFileSync } from "fs";

class PolicyController {
  // Upload and extract policy data from document
  async uploadPolicyDocument(req, res) {
    const insurance_company_id = req.user.id;

    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          message:
            "Please upload a policy document (PDF, Image, or Word document)",
        });
      }
      const fileInfo = getFileInfo(req.file);
      console.log(`📄 Processing policy document: ${fileInfo.originalname}`);

      // Extract policy data using AI/OCR
      const extractionResult = await policyExtractionService.extractPolicyData(
        req.file.path,
        req.file.mimetype
      );

      if (!extractionResult.success) {
        // Clean up uploaded file if extraction failed
        deleteUploadedFile(req.file.filename);

        return res.status(400).json({
          error: "Policy extraction failed",
          message: extractionResult.error,
          file_info: fileInfo,
        });
      }

      // Store the extraction result temporarily (not in final policies table yet)
      // This allows for review and correction before final submission
      const tempId = uuidv4();

      const tempResult = await db.pool.query(
        `
        INSERT INTO policy_extractions (
          temp_id, insurance_company_id, original_filename, file_path, file_url,
          extracted_text, structured_data, confidence_score, extraction_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          tempId,
          insurance_company_id,
          fileInfo.originalname,
          req.file.path,
          fileInfo.url,
          extractionResult.extractedText,
          JSON.stringify(extractionResult.structuredData),
          extractionResult.confidence,
          "pending_review",
        ]
      );

      console.log(
        `✅ Policy extraction completed with ${extractionResult.confidence}% confidence`
      );

      res.status(200).json({
        message: "Policy document processed successfully",
        temp_id: tempId,
        file_info: fileInfo,
        extracted_data: extractionResult.structuredData,
        confidence_score: extractionResult.confidence,
        extraction_status: "pending_review",
        next_step:
          "Review the extracted data and call /api/policies/confirm to finalize",
      });
    } catch (error) {
      console.error("Error processing policy document:", error);

      // Clean up uploaded file on error
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }

      res.status(500).json({
        error: "Internal server error",
        message: "Failed to process policy document",
      });
    }
  }

  // Confirm and save extracted policy data
  async confirmPolicyData(req, res) {
    const { temp_id, corrections, iot_device_serial } = req.body;
    const insurance_company_id = req.user.id;

    console.log("=== CONFIRM POLICY DEBUG ===");
    console.log("temp_id:", temp_id);
    console.log("corrections:", corrections);
    console.log("insurance_company_id:", insurance_company_id);

    try {
      if (!temp_id) {
        console.log("ERROR: Missing temp_id");
        return res.status(400).json({
          error: "Missing temp_id",
          message: "temp_id is required to confirm policy data",
        });
      }

      // Get the temporary extraction data
      const tempResult = await db.pool.query(
        `
        SELECT * FROM policy_extractions 
        WHERE temp_id = $1 AND insurance_company_id = $2 AND extraction_status = 'pending_review'
      `,
        [temp_id, insurance_company_id]
      );

      if (tempResult.rows.length === 0) {
        return res.status(404).json({
          error: "Extraction not found or already processed",
        });
      }

      const extractionData = tempResult.rows[0];
      let policyData =
        typeof extractionData.structured_data === "string"
          ? JSON.parse(extractionData.structured_data)
          : extractionData.structured_data;

      // Apply any corrections provided by the user
      if (corrections && typeof corrections === "object") {
        policyData = { ...policyData, ...corrections };
        console.log(
          `📝 Applied corrections to policy data for temp_id: ${temp_id}`
        );
      }

      // Add validation and default values before the INSERT
      // Set default end date if missing (e.g., 1 year from start date)
      if (!policyData.policy_end_date && policyData.policy_start_date) {
        const startDate = new Date(policyData.policy_start_date);
        const endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 1); // Add 1 year
        policyData.policy_end_date = endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
        console.log(`📅 Set default end date: ${policyData.policy_end_date}`);
      }

      // Validate required fields
      if (!policyData.policy_number || !policyData.policy_holder_name) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "policy_number and policy_holder_name are required",
          current_data: policyData,
        });
      }

      // Add validation for dates
      if (!policyData.policy_start_date || !policyData.policy_end_date) {
        return res.status(400).json({
          error: "Missing required dates",
          message: "policy_start_date and policy_end_date are required",
          current_data: policyData,
        });
      }

      // Check if policy number already exists for this insurance company
      const existingPolicy = await db.pool.query(
        "SELECT id FROM policies WHERE policy_number = $1 AND insurance_company_id = $2",
        [policyData.policy_number, insurance_company_id]
      );

      if (existingPolicy.rows.length > 0) {
        return res.status(409).json({
          error: "Policy number already exists for this insurance company",
          policy_number: policyData.policy_number,
        });
      }

      // Generate unique Kora policy ID
      const kora_policy_id = uuidv4();

      // Insert final policy data
      const result = await db.pool.query(
        `
        INSERT INTO policies (
          policy_number, policy_holder_name, policy_holder_email, policy_holder_phone,
          policy_type, coverage_amount, premium_amount, deductible_amount,
          policy_start_date, policy_end_date, insurance_company_id,
          policy_document_url, policy_document_filename, policy_document_size,
          kora_policy_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `,
        [
          policyData.policy_number,
          policyData.policy_holder_name,
          policyData.policy_holder_email,
          policyData.policy_holder_phone,
          policyData.policy_type,
          policyData.coverage_amount,
          policyData.premium_amount,
          policyData.deductible_amount,
          policyData.policy_start_date,
          policyData.policy_end_date,
          insurance_company_id,
          extractionData.file_url,
          extractionData.original_filename,
          null, // file size
          kora_policy_id,
        ]
      );

      const newPolicy = result.rows[0];

      // Update extraction status to completed
      await db.pool.query(
        `
        UPDATE policy_extractions 
        SET extraction_status = 'completed', policy_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE temp_id = $2
      `,
        [newPolicy.id, temp_id]
      );

      console.log(`✅ Policy confirmed and saved: ${policyData.policy_number}`);

      // Register policy hash on blockchain for integrity verification
      try {
        const pdfBuffer = readFileSync(extractionData.file_path);
        const blockchainResult = await registerPolicyHashOnChain(
          {
            policyNumber: newPolicy.policy_number,
            customerName: newPolicy.policy_holder_name,
            coverageAmount: newPolicy.coverage_amount,
            deductible: newPolicy.deductible_amount,
            policyType: newPolicy.policy_type,
            insuranceCompany: req.user.company_name || "Unknown Company",
          },
          pdfBuffer
        );

        if (blockchainResult.success) {
          console.log(
            `🔗 Policy hash registered on blockchain: ${blockchainResult.txHash}`
          );
          // Optionally store blockchain info in database
          await db.pool.query(
            "UPDATE policies SET blockchain_tx_hash = $1, blockchain_registered = true WHERE id = $2",
            [blockchainResult.txHash, newPolicy.id]
          );
        } else {
          console.log(
            `⚠️ Blockchain registration failed: ${blockchainResult.error}`
          );
        }
      } catch (blockchainError) {
        console.log(
          `⚠️ Blockchain registration error: ${blockchainError.message}`
        );
        // Don't fail the entire policy creation if blockchain fails
      }

      res.status(201).json({
        message: "Policy created successfully from document",
        policy: {
          id: newPolicy.id,
          policy_number: newPolicy.policy_number,
          policy_holder_name: newPolicy.policy_holder_name,
          policy_holder_email: newPolicy.policy_holder_email,
          policy_type: newPolicy.policy_type,
          coverage_amount: newPolicy.coverage_amount,
          premium_amount: newPolicy.premium_amount,
          policy_start_date: newPolicy.policy_start_date,
          policy_end_date: newPolicy.policy_end_date,
          policy_status: newPolicy.policy_status,
          kora_policy_id: newPolicy.kora_policy_id,
          extraction_confidence: newPolicy.extraction_confidence,
          document_filename: newPolicy.policy_document_filename,
          created_at: newPolicy.created_at,
        },
      });
    } catch (error) {
      console.error("=== CONFIRM POLICY ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);

      if (error.code === "23505") {
        res.status(400).json({ error: "Policy number already exists" });
      } else {
        res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      }
    }
  }

  // Get pending extractions for review
  async getPendingExtractions(req, res) {
    const insurance_company_id = req.user.id;

    try {
      const result = await db.pool.query(
        `
        SELECT temp_id, original_filename, structured_data, confidence_score, created_at
        FROM policy_extractions 
        WHERE insurance_company_id = $1 AND extraction_status = 'pending_review'
        ORDER BY created_at DESC
      `,
        [insurance_company_id]
      );

      const pendingExtractions = result.rows.map((row) => ({
        temp_id: row.temp_id,
        filename: row.original_filename,
        extracted_data:
          typeof row.structured_data === "string"
            ? JSON.parse(row.structured_data)
            : row.structured_data,
        confidence_score: row.confidence_score,
        created_at: row.created_at,
      }));

      res.status(200).json({
        pending_extractions: pendingExtractions,
        count: pendingExtractions.length,
      });
    } catch (error) {
      console.error("Error fetching pending extractions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get all policies for an insurance company
  async getPolicies(req, res) {
    const insurance_company_id = req.user.id;
    console.log("=== GET POLICIES DEBUG ===");
    console.log("Requesting user ID:", insurance_company_id);
    console.log("Full user object:", req.user);

    try {
      // First, let's see ALL policies regardless of insurance_company_id
      const allPoliciesResult = await db.pool.query(
        "SELECT id, policy_number, insurance_company_id FROM policies"
      );
      console.log("All policies in database:", allPoliciesResult.rows);

      // Now the filtered query
      const result = await db.pool.query(
        `SELECT id, policy_number, policy_holder_name, policy_holder_email,
                policy_type, coverage_amount, premium_amount, policy_start_date,
                policy_end_date, policy_status, kora_policy_id, extraction_confidence,
                policy_document_filename, created_at, insurance_company_id
         FROM policies 
         WHERE insurance_company_id = $1
         ORDER BY created_at DESC`,
        [insurance_company_id]
      );

      console.log(
        "Filtered policies for company",
        insurance_company_id,
        ":",
        result.rows
      );
      console.log("Number of policies found:", result.rows.length);

      res.status(200).json({
        policies: result.rows,
        debug: {
          requesting_company_id: insurance_company_id,
          total_policies_found: result.rows.length,
        },
      });
    } catch (error) {
      console.error("Error fetching policies:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get a specific policy by ID
  async getPolicyById(req, res) {
    const { id } = req.params;
    const insurance_company_id = req.user.id;

    try {
      const result = await db.pool.query(
        `
        SELECT * FROM policies 
        WHERE id = $1 AND insurance_company_id = $2
      `,
        [id, insurance_company_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Policy not found" });
      }

      const policy = result.rows[0];

      // Parse additional_info if it exists
      if (policy.additional_info) {
        policy.additional_info = JSON.parse(policy.additional_info);
      }

      res.status(200).json({ policy: policy });
    } catch (error) {
      console.error("Error fetching policy:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new PolicyController();
