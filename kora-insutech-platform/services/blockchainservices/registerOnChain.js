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
export async function registerIoTDeviceOnChain(koraDeviceId, deviceType) {
  try {
    console.log(
      "🔗 Attempting IoT device blockchain registration for:",
      koraDeviceId
    );

    // For now, we'll use a simple approach - you can extend the smart contract later
    // to have specific IoT device registration functions
    console.log(
      "📱 IoT Device registered locally, blockchain integration pending"
    );

    // TODO: Implement actual smart contract function for IoT devices
    // const tx = await contract.registerIoTDevice(koraDeviceId, deviceType);
    // const receipt = await tx.wait();
    // return { success: true, txHash: receipt.hash || tx.hash };

    return {
      success: true,
      txHash: "pending_iot_implementation",
      message: "IoT device registered locally, blockchain integration pending",
    };
  } catch (error) {
    console.error("❌ IoT device on-chain registration failed:", error.message);
    return { success: false, error: error.message };
  }
}
