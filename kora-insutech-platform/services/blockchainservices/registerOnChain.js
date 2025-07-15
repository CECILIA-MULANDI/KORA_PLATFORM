import { ethers } from "ethers";
import abi from "./abi.json";
const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

export async function registerOnChain(insurerId) {
  try {
    const tx = await contract.registerInsuranceCompany(insurerId);
    const receipt = await tx.wait();
    return { sucess: true, txHash: receipt.transcationHash };
  } catch (error) {
    console.error("On-chain registration failed:", error);
    return { success: false, error: error.message };
  }
}
