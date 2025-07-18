import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
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
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  // Extract text from image files using OCR
  async extractTextFromImage(filePath) {
    try {
      // First, optimize the image for better OCR results
      const optimizedImagePath = await this.optimizeImageForOCR(filePath);

      // Use Tesseract.js for OCR
      const {
        data: { text },
      } = await Tesseract.recognize(optimizedImagePath, "eng", {
        logger: (m) =>
          console.log(
            `OCR Progress: ${m.status} ${
              m.progress ? Math.round(m.progress * 100) + "%" : ""
            }`
          ),
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
        .resize(null, 2000, { withoutEnlargement: true }) // Increase height to 2000px max
        .greyscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .png() // Convert to PNG for better OCR
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.warn("Image optimization failed, using original:", error.message);
      return filePath; // Return original if optimization fails
    }
  }

  // Use OpenAI to structure extracted text into policy data
  async structureTextWithAI(extractedText) {
    try {
      const prompt = `
You are an AI assistant specialized in extracting structured data from insurance policy documents. 
Please analyze the following text extracted from an insurance policy document and extract the key information.

Return the data in the following JSON format:
{
  "policy_number": "string",
  "policy_holder_name": "string", 
  "policy_holder_email": "string or null",
  "policy_holder_phone": "string or null",
  "policy_type": "string (auto, health, life, property, etc.)",
  "coverage_amount": "number (in dollars)",
  "premium_amount": "number (in dollars)",
  "deductible_amount": "number (in dollars)",
  "policy_start_date": "YYYY-MM-DD format",
  "policy_end_date": "YYYY-MM-DD format",
  "additional_info": {
    "vehicle_info": "string or null (for auto policies)",
    "property_address": "string or null (for property policies)",
    "beneficiaries": "string or null (for life policies)",
    "medical_conditions": "string or null (for health policies)"
  }
}

If any information is not found or unclear, use null for that field.
Be as accurate as possible and only extract information that is clearly stated in the document.

Document text:
${extractedText}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at extracting structured data from insurance documents. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 1000,
      });

      const aiResponse = response.choices[0].message.content;

      // Parse the JSON response
      try {
        const structuredData = JSON.parse(aiResponse);
        return this.validateAndCleanData(structuredData);
      } catch (parseError) {
        console.error("❌ Failed to parse AI response as JSON:", aiResponse);
        throw new Error("AI response was not valid JSON");
      }
    } catch (error) {
      if (error.message.includes("API key")) {
        console.warn(
          "⚠️ OpenAI API key not configured, using fallback extraction"
        );
        return this.fallbackExtraction(extractedText);
      }
      throw new Error(`AI structuring failed: ${error.message}`);
    }
  }

  // Fallback extraction using regex patterns (when AI is not available)
  fallbackExtraction(text) {
    const data = {
      policy_number: this.extractWithRegex(
        text,
        /policy\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9\-]+)/i
      ),
      policy_holder_name: this.extractWithRegex(
        text,
        /(?:insured|policy\s*holder|name)\s*:?\s*([A-Za-z\s]+)/i
      ),
      policy_holder_email: this.extractWithRegex(
        text,
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      ),
      policy_holder_phone: this.extractWithRegex(
        text,
        /(?:phone|tel|mobile)\s*:?\s*([\d\-\(\)\s]+)/i
      ),
      policy_type: this.extractWithRegex(
        text,
        /(?:policy\s*type|coverage\s*type)\s*:?\s*(auto|health|life|property|home|car)/i
      ),
      coverage_amount: this.extractAmountWithRegex(
        text,
        /(?:coverage|sum\s*insured|limit)\s*:?\s*\$?([\d,]+)/i
      ),
      premium_amount: this.extractAmountWithRegex(
        text,
        /(?:premium|payment)\s*:?\s*\$?([\d,]+)/i
      ),
      deductible_amount: this.extractAmountWithRegex(
        text,
        /deductible\s*:?\s*\$?([\d,]+)/i
      ),
      policy_start_date: this.extractDateWithRegex(
        text,
        /(?:effective|start|from)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
      ),
      policy_end_date: this.extractDateWithRegex(
        text,
        /(?:expir|end|to|until)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
      ),
      additional_info: {},
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
