import fs from "fs";
import path from "path";
import pdf2pic from "pdf2pic";
import Tesseract from "tesseract.js";
import sharp from "sharp";

// Alternative AI services - choose one or multiple as fallbacks
const AI_SERVICES = {
  GOOGLE_DOCUMENT_AI: "google",
  ANTHROPIC_CLAUDE: "anthropic",
  OLLAMA_LOCAL: "ollama",
  AZURE_FORM_RECOGNIZER: "azure",
  FALLBACK_REGEX: "regex",
};

// Configuration - set your preferred service in .env file
// AI_SERVICE=ollama (for free local AI
// AI_SERVICE=google (for Google Document AI)
// AI_SERVICE=anthropic (for Claude)
const PRIMARY_AI_SERVICE = process.env.AI_SERVICE || AI_SERVICES.OLLAMA_LOCAL;

class PolicyExtractionService {
  // extract policy data from uploaded document
  async extractPolicyData(filePath, mimetype) {
    try {
      console.log(`📄 Starting policy extraction for: ${filePath}`);

      let extractedText = "";

      // Extract text based on file type
      if (mimetype === "application/pdf") {
        extractedText = await this.extractTextFromPDF(filePath);
      } else if (mimetype.startsWith("image/")) {
        extractedText = await this.extractTextFromImage(filePath);
      } else if (mimetype.includes("word")) {
        // For Word documents, you might need additional libraries like mammoth
        throw new Error("Word document processing not yet implemented");
      } else {
        throw new Error(`Unsupported file type: ${mimetype}`);
      }

      console.log(
        `📝 Extracted text length: ${extractedText.length} characters`
      );

      // Use AI to structure the extracted text into policy data
      const structuredData = await this.structureTextWithAI(extractedText);

      return {
        success: true,
        extractedText: extractedText,
        structuredData: structuredData,
        confidence: this.calculateConfidence(structuredData),
      };
    } catch (error) {
      console.error("❌ Policy extraction error:", error);
      return {
        success: false,
        error: error.message,
        extractedText: "",
        structuredData: null,
        confidence: 0,
      };
    }
  }

  // Extract text from PDF files
  async extractTextFromPDF(filePath) {
    try {
      const convert = pdf2pic.fromPath(filePath, {
        density: 300, // Higher DPI for better quality
        saveFilename: "page",
        savePath: "./temp",
        format: "png",
        width: 2480, // A4 at 300 DPI
        height: 3508,
      });

      const result = await convert(1); // Convert first page
      const imagePath = result.path;

      const extractedText = await this.extractTextFromImage(imagePath);

      // Clean up temporary image
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      return extractedText;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  // Extract text from image files using OCR
  async extractTextFromImage(filePath) {
    try {
      const optimizedImagePath = await this.optimizeImageForOCR(filePath);

      const {
        data: { text },
      } = await Tesseract.recognize(optimizedImagePath, "eng", {
        logger: (m) =>
          console.log(
            `OCR Progress: ${m.status} ${
              m.progress ? Math.round(m.progress * 100) + "%" : ""
            }`
          ),
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/@ ",
        preserve_interword_spaces: "1",
      });

      // Clean up optimized image if it's different from original
      if (optimizedImagePath !== filePath) {
        fs.unlinkSync(optimizedImagePath);
      }

      return text;
    } catch (error) {
      throw new Error(`Image OCR failed: ${error.message}`);
    }
  }

  // Optimize image for better OCR results
  async optimizeImageForOCR(filePath) {
    try {
      const outputPath = filePath.replace(
        path.extname(filePath),
        "_optimized.png"
      );

      await sharp(filePath)
        .resize(null, 3000, { withoutEnlargement: true }) // Increase to 3000px for better text recognition
        .greyscale()
        .normalize()
        .sharpen({ sigma: 1.5 }) // More aggressive sharpening
        .threshold(128) // Convert to black and white for better OCR
        .png({ quality: 100 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.warn("Image optimization failed, using original:", error.message);
      return filePath;
    }
  }
  cleanExtractedName(name) {
    if (!name) return null;

    // Remove common trailing phrases that get picked up
    const cleanPatterns = [
      /\s+Period\s+of\s+Insurance.*$/i,
      /\s+Policy\s+Period.*$/i,
      /\s+Insurance\s+Period.*$/i,
      /\s+Coverage\s+Period.*$/i,
      /\s+From\s+\d+.*$/i,
      /\s+\d{2}\/\d{2}\/\d{4}.*$/i,
      /\s+\d{2}:\d{2}.*$/i,
      /\s+Hrs\s+on.*$/i,
    ];

    let cleaned = name.trim();

    cleanPatterns.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, "");
    });

    // Remove extra whitespace and limit length
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Ensure reasonable name length
    if (cleaned.length > 50) {
      cleaned = cleaned.substring(0, 50).trim();
    }

    return cleaned || null;
  }

  // Use AI to structure extracted text into policy data
  async structureTextWithAI(extractedText) {
    try {
      console.log("=== DEBUG: First 1000 characters of extracted text ===");
      console.log(extractedText.substring(0, 1000));
      console.log("=== END DEBUG ===");

      // Check if Ollama is available by making a simple request
      let ollamaAvailable = false;
      if (PRIMARY_AI_SERVICE === AI_SERVICES.OLLAMA_LOCAL) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          const healthCheck = await fetch(
            `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/tags`,
            {
              method: "GET",
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);
          ollamaAvailable = healthCheck.ok;
        } catch (e) {
          console.warn("Ollama health check failed:", e.message);
          ollamaAvailable = false;
        }
      }

      // If Ollama is not available, use fallback immediately
      if (PRIMARY_AI_SERVICE === AI_SERVICES.OLLAMA_LOCAL && !ollamaAvailable) {
        console.warn("Ollama service not available, using fallback extraction");
        return this.fallbackExtraction(extractedText);
      }

      // Otherwise try the configured service
      switch (PRIMARY_AI_SERVICE) {
        case AI_SERVICES.OLLAMA_LOCAL:
          return await this.structureWithOllama(extractedText);
        case AI_SERVICES.ANTHROPIC_CLAUDE:
          return await this.structureWithClaude(extractedText);
        case AI_SERVICES.GOOGLE_DOCUMENT_AI:
          return await this.structureWithGoogle(extractedText);
        case AI_SERVICES.FALLBACK_REGEX:
          return this.fallbackExtraction(extractedText);
        default:
          console.warn(
            `Unknown AI service: ${PRIMARY_AI_SERVICE}, using fallback`
          );
          return this.fallbackExtraction(extractedText);
      }
    } catch (error) {
      console.warn(
        `AI service ${PRIMARY_AI_SERVICE} failed, using fallback:`,
        error.message
      );
      return this.fallbackExtraction(extractedText);
    }
  }

  // Ollama implementation
  async structureWithOllama(extractedText) {
    const prompt = `Extract insurance policy data from this text and return ONLY valid JSON:
${extractedText}

Return format:
{"policy_number":"","policy_holder_name":"","policy_type":"","coverage_amount":0,"premium_amount":0,"deductible_amount":0,"policy_start_date":"","policy_end_date":"","policy_holder_email":"","policy_holder_phone":"","additional_info":{}}`;

    const response = await fetch(
      `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3.2",
          prompt: prompt,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error("No response from Ollama");
    }

    try {
      const structuredData = JSON.parse(data.response);
      return this.validateAndCleanData(structuredData);
    } catch (parseError) {
      console.warn("Failed to parse Ollama response as JSON:", data.response);
      throw new Error("Invalid JSON response from Ollama");
    }
  }

  // Fallback extraction using regex patterns (when AI is not available)
  fallbackExtraction(text) {
    console.log("Raw extracted text:", text.substring(0, 500)); // Debug first 500 chars

    const data = {
      policy_number:
        this.extractWithRegex(
          text,
          /Policy\s*\/?\s*Certificate\s*No\.?\s*:?\s*([0-9]{10,15})/i
        ) || this.extractWithRegex(text, /([0-9]{12,15})/), // Long number sequences

      policy_holder_name: this.cleanExtractedName(
        this.extractWithRegex(
          text,
          /Name\s*of\s*Insured\s*:?\s*(MR\.?\s*[A-Z\s]+)/i
        ) || this.extractWithRegex(text, /Insured\s*:?\s*(MR\.?\s*[A-Z\s]+)/i)
      ),
      policy_holder_email: this.extractWithRegex(
        text,
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      ),

      policy_holder_phone:
        this.extractWithRegex(
          text,
          /Contact\s*details\s*:?\s*([0-9\-\s+]{10,15})/i
        ) || this.extractWithRegex(text, /([0-9]{10})/), // 10-digit phone numbers

      policy_type:
        text.toLowerCase().includes("vehicle") ||
        text.toLowerCase().includes("car")
          ? "auto"
          : text.toLowerCase().includes("health")
          ? "health"
          : "unknown",

      coverage_amount:
        this.extractAmountWithRegex(
          text,
          /IDV\s*\(Insurer.*Declared.*Value\)\s*Rs\.?\s*([0-9,]+)/i
        ) ||
        this.extractAmountWithRegex(
          text,
          /Total\s*Cover\s*SI.*Rs\.?\s*([0-9,]+)/i
        ) ||
        this.extractAmountWithRegex(text, /([0-9]{3},?[0-9]{3})/), // Look for 6-digit amounts

      premium_amount:
        this.extractAmountWithRegex(text, /FINAL\s*PREMIUM\s*([0-9,]+)/i) ||
        this.extractAmountWithRegex(text, /Total.*Premium.*([0-9,]+)/i),

      deductible_amount: this.extractAmountWithRegex(
        text,
        /deductible\s*Rs\.?\s*([0-9,]+)/i
      ),

      policy_start_date:
        this.extractDateWithRegex(
          text,
          /From\s*([0-9]{2}:[0-9]{2})\s*Hrs\s*on\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
        ) ||
        this.extractDateWithRegex(
          text,
          /Period\s*of\s*Insurance.*From.*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
        ),

      policy_end_date:
        this.extractDateWithRegex(
          text,
          /to\s*([0-9]{2}:[0-9]{2})\s*on\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
        ) || this.extractDateWithRegex(text, /([0-9]{4}-[0-9]{2}-[0-9]{2})/), // ISO format

      additional_info: {
        vehicle_registration: this.extractWithRegex(
          text,
          /Registration\s*Number.*([A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4})/i
        ),
        vehicle_make: this.extractWithRegex(text, /Make.*Model.*([A-Z]+)/i),
        vehicle_model: this.extractWithRegex(
          text,
          /(CHEVROLET|MARUTI|HONDA|TOYOTA|[A-Z]+)\s+([A-Z0-9\s]+)/i
        ),
        engine_number: this.extractWithRegex(
          text,
          /Engine.*Chassis.*Vehicle.*([A-Z0-9]+)/i
        ),
        zone: this.extractWithRegex(
          text,
          /Zone\s*A.*Geographical\s*Area\s*([A-Za-z]+)/i
        ),
      },
    };

    return this.validateAndCleanData(data);
  }

  // Helper function to extract data using regex
  extractWithRegex(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  // Helper function to extract and parse amounts
  extractAmountWithRegex(text, regex) {
    const match = text.match(regex);
    if (match) {
      const amount = match[1].replace(/,/g, "");
      return parseFloat(amount) || null;
    }
    return null;
  }

  // Helper function to extract and format dates
  extractDateWithRegex(text, regex) {
    const match = text.match(regex);
    if (match) {
      try {
        const date = new Date(match[1]);
        return date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  // Validate and clean extracted data
  validateAndCleanData(data) {
    // Clean up strings
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string") {
        data[key] = data[key].trim();
        if (data[key] === "" || data[key].toLowerCase() === "null") {
          data[key] = null;
        }
      }
    });

    // Validate required fields and set defaults
    return {
      policy_number: data.policy_number || null,
      policy_holder_name: data.policy_holder_name || null,
      policy_holder_email: data.policy_holder_email || null,
      policy_holder_phone: data.policy_holder_phone || null,
      policy_type: data.policy_type || "unknown",
      coverage_amount: data.coverage_amount || 0,
      premium_amount: data.premium_amount || 0,
      deductible_amount: data.deductible_amount || 0,
      policy_start_date: data.policy_start_date || null,
      policy_end_date: data.policy_end_date || null,
      additional_info: data.additional_info || {},
    };
  }

  // Calculate confidence score based on how much data was extracted
  calculateConfidence(data) {
    const requiredFields = [
      "policy_number",
      "policy_holder_name",
      "policy_type",
      "coverage_amount",
    ];
    const optionalFields = [
      "policy_holder_email",
      "policy_holder_phone",
      "premium_amount",
      "policy_start_date",
      "policy_end_date",
    ];

    let score = 0;
    let maxScore = 0;

    // Required fields (worth 20 points each)
    requiredFields.forEach((field) => {
      maxScore += 20;
      if (data[field] && data[field] !== null && data[field] !== "") {
        score += 20;
      }
    });

    // Optional fields (worth 5 points each)
    optionalFields.forEach((field) => {
      maxScore += 5;
      if (data[field] && data[field] !== null && data[field] !== "") {
        score += 5;
      }
    });

    return Math.round((score / maxScore) * 100);
  }
}

export default new PolicyExtractionService();
