import { expect } from "chai";
import { ethers } from "hardhat";

const IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"; // EIP-1967 impl slot

function toAddress(storageWord: string): string {
  return ethers.getAddress("0x" + storageWord.slice(26));
}

describe("UUPS upgrade flow (BproUsdAggregatorV2Governed)", () => {
  it("deploys proxy, reads, blocks unauthorized upgrade, allows authorized upgrade to MockV2, preserves state", async () => {
    const [deployer, attacker] = await ethers.getSigners();

    // --- Deploy mocks ---
    const MockSrc = await ethers.getContractFactory("MockMoCState");
    const price = ethers.parseUnits("123.456", 18);
    const src = await MockSrc.deploy(price);
    await src.waitForDeployment();

    const Gov = await ethers.getContractFactory("MockGovernor");
    const governor = await Gov.deploy();
    await governor.waitForDeployment();
    // Authorize the deployer as a changer
    await (await governor.setAuthorized(deployer.address, true)).wait();

    // --- Deploy impl V1 ---
    const V1 = await ethers.getContractFactory("BproUsdAggregatorV2Governed");
    const implV1 = await V1.deploy();
    await implV1.waitForDeployment();
    const implV1Addr = await implV1.getAddress();

    // --- Encode initialize(governor, mocState) ---
    const initData = V1.interface.encodeFunctionData("initialize", [
      await governor.getAddress(),
      await src.getAddress(),
    ]);

    // --- Deploy proxy pointing to V1 + init ---
    const Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
    );
    const proxy = await Proxy.deploy(implV1Addr, initData);
    await proxy.waitForDeployment();
    const proxyAddr = await proxy.getAddress();

    const aggV1 = await ethers.getContractAt("BproUsdAggregatorV2Governed", proxyAddr);

    // Read works
    const got1 = await aggV1.latestAnswer();
    expect(got1).to.equal(price);

    // Impl slot points to V1
    const slotBefore = await ethers.provider.getStorage(proxyAddr, IMPL_SLOT);
    expect(toAddress(slotBefore)).to.equal(implV1Addr);

    // --- Unauthorized upgrade reverts (attacker not authorized) ---
    const implV1b = await V1.deploy();
    await implV1b.waitForDeployment();
    await expect(
      aggV1.connect(attacker).upgradeTo(await implV1b.getAddress())
    ).to.be.reverted;

    // --- Deploy Mock V2 and upgrade as authorized changer ---
    const V2 = await ethers.getContractFactory("BproUsdAggregatorV2GovernedMockV2");
    const implV2 = await V2.deploy();
    await implV2.waitForDeployment();
    const implV2Addr = await implV2.getAddress();

    const txUp = await aggV1.connect(deployer).upgradeTo(implV2Addr);
    await txUp.wait();

    // Impl slot updated
    const slotAfter = await ethers.provider.getStorage(proxyAddr, IMPL_SLOT);
    expect(toAddress(slotAfter)).to.equal(implV2Addr);

    // State preserved
    const got2 = await aggV1.latestAnswer();
    expect(got2).to.equal(price);

    // New function exists on Mock V2
    const aggV2 = await ethers.getContractAt("BproUsdAggregatorV2GovernedMockV2", proxyAddr);
    const ver = await aggV2.version();
    expect(ver).to.equal(2n);

    // Re-initialize should revert
    await expect(
      aggV1.initialize(await governor.getAddress(), await src.getAddress())
    ).to.be.reverted;
  });
});
