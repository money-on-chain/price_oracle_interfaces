import { ethers } from "hardhat";

async function main() {
  const mocState = process.env.MOC_STATE || "0x0adb40132cB0ffcEf6ED81c26A1881e214100555";
  const governor = process.env.GOVERNOR;
  if (!governor) throw new Error("Set GOVERNOR in .env");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Governor:  ${governor}`);
  console.log(`MoCState:  ${mocState}`);

  // 1) Deploy implementation (UUPS)
  const ImplFactory = await ethers.getContractFactory("BproUsdAggregatorV2Governed");
  const impl = await ImplFactory.deploy();              // no constructor args (UUPS impl)
  await impl.waitForDeployment();
  const implAddr = await impl.getAddress();
  console.log(`Implementation deployed at: ${implAddr}`);

  // 2) Encode initializer call
  const initData = ImplFactory.interface.encodeFunctionData("initialize", [governor, mocState]);

  // 3) Deploy ERC1967Proxy pointing to implementation + init
  //    Note: use the fully-qualified name from node_modules
  const ProxyFactory = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
  );
  const proxy = await ProxyFactory.deploy(implAddr, initData);
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log(`Proxy deployed at:          ${proxyAddr}`);

  // 4) (Optional) attach the proxy as the implementation ABI to interact
  const aggregator = await ethers.getContractAt("BproUsdAggregatorV2Governed", proxyAddr);

  // Sanity check: read state if you want (will call through the proxy)
  // const answer = await aggregator.latestAnswer();
  // console.log("latestAnswer()", answer.toString());

  console.log("UUPS governed adapter deployed & initialized via proxy.");
  console.log(`\nAddresses:\n  Impl:  ${implAddr}\n  Proxy: ${proxyAddr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

