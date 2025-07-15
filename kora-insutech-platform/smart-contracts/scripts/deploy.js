const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const InsuranceCompanies = await hre.ethers.getContractFactory(
    "InsuranceCompanies"
  );
  const insuranceCompanies = await InsuranceCompanies.deploy();

  console.log(
    "InsuranceCompanies deployed to:",
    await insuranceCompanies.getAddress()
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
// 0x81EEA78A27D729BA598750301C26E8D21DcA8B37
