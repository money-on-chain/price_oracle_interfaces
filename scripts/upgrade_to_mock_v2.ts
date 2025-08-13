import { ethers } from "hardhat";

async function main() {
  const proxy = process.env.PROXY;
  if (!proxy) throw new Error("Set PROXY in env");

  const V2 = await ethers.getContractFactory("BproUsdAggregatorV2GovernedMockV2");
  const impl = await V2.deploy();
  await impl.waitForDeployment();

  const proxyAsV1 = await ethers.getContractAt("BproUsdAggregatorV2Governed", proxy);
  const tx = await proxyAsV1.upgradeTo(await impl.getAddress());
  await tx.wait();

  console.log("Upgraded proxy to MockV2 at:", await impl.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
