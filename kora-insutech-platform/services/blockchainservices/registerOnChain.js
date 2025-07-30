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
