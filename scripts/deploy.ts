import { ethers } from "hardhat";

async function main() {
  const mocState = process.env.MOC_STATE || "0x0adb40132cB0ffcEf6ED81c26A1881e214100555";

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`MoCState: ${mocState}`);

  const Factory = await ethers.getContractFactory("BproUsdAggregatorV2Minimal");
  const contract = await Factory.deploy(mocState);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log(`BproUsdAggregatorV2Minimal deployed at: ${addr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
