import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const abi = JSON.parse(readFileSync(path.join(__dirname, "abi.json"), "utf8"));

// Debug environment variables
console.log("🔧 Blockchain Environment Check:");
console.log(
  "PROVIDER_URL:",
  process.env.PROVIDER_URL ? "✅ Set" : "❌ Missing"
);
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Set" : "❌ Missing");
console.log(
  "CONTRACT_ADDRESS:",
  process.env.CONTRACT_ADDRESS ? "✅ Set" : "❌ Missing"
);

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

export async function registerOnChain(insurerId) {
  try {
    console.log("🔗 Attempting blockchain registration for:", insurerId);
    const tx = await contract.registerInsuranceCompany(insurerId);
    console.log("📝 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("📋 Receipt object keys:", Object.keys(receipt));
    console.log("✅ Transaction confirmed. Hash from tx:", tx.hash);
    console.log("✅ Transaction confirmed. Hash from receipt:", receipt.hash);

    // Use tx.hash instead of receipt.transactionHash
    const txHash = receipt.hash || tx.hash;
    return { success: true, txHash: txHash };
  } catch (error) {
    console.error("❌ On-chain registration failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Register IoT device on blockchain
export async function registerIoTDeviceOnChain(deviceId, policyId = "") {
  try {
    console.log(
      "🔗 Attempting IoT device blockchain registration for:",
      deviceId
    );
    console.log("🔗 Policy ID:", policyId || "No policy linked");

    // Call the actual smart contract function
    const tx = await contract.registerIoTDevice(deviceId, policyId);
    console.log("📝 IoT Device transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ IoT Device transaction confirmed. Hash:", tx.hash);

    const txHash = receipt.hash || tx.hash;
    return {
      success: true,
      txHash: txHash,
      message: "IoT device successfully registered on blockchain",
    };
  } catch (error) {
    console.error("❌ IoT device on-chain registration failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Register policy hash on blockchain (privacy-preserving)
export async function registerPolicyHashOnChain(policyData, pdfBuffer) {
  try {
    console.log(
      "🔗 Attempting policy hash blockchain registration for:",
      policyData.policyNumber
    );

    // Create hash of sensitive policy data (for integrity verification)
    const dataString = JSON.stringify({
      policyNumber: policyData.policyNumber,
      customerName: policyData.customerName,
      coverageAmount: policyData.coverageAmount,
      deductible: policyData.deductible,
      policyType: policyData.policyType,
      // Add other sensitive fields that need integrity protection
    });
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));

    // Create hash of original PDF document
    const documentHash = ethers.keccak256(pdfBuffer);

    console.log("📝 Policy data hash:", dataHash);
    console.log("📄 Document hash:", documentHash);

    // Call the actual smart contract function
    const tx = await contract.registerPolicyHash(
      policyData.policyNumber,
      policyData.insuranceCompany,
      dataHash,
      documentHash
    );
    console.log("📝 Policy hash transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Policy hash transaction confirmed. Hash:", tx.hash);

    const txHash = receipt.hash || tx.hash;
    return {
      success: true,
      txHash: txHash,
      dataHash: dataHash,
      documentHash: documentHash,
      message: "Policy hash successfully registered on blockchain",
    };
  } catch (error) {
    console.error(
      "❌ Policy hash on-chain registration failed:",
      error.message
    );
    return { success: false, error: error.message };
  }
}
