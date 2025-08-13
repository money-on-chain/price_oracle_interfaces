import { ethers } from "hardhat";
import { expect } from "chai";

describe("BproUsdAggregatorV2Minimal", function () {
  it("mirrors bproUsdPrice()", async () => {
    // Inline 0.5.8 source for the mock
    const MockSrc = await ethers.getContractFactory("MockMoCState");
    const price = ethers.parseUnits("123.456", 18);
    const src = await MockSrc.deploy(price);
    await src.waitForDeployment();

    const Adapter = await ethers.getContractFactory("BproUsdAggregatorV2Minimal");
    const adapter = await Adapter.deploy(await src.getAddress());
    await adapter.waitForDeployment();

    const got = await adapter.latestAnswer();
    expect(got).to.equal(price);
  });
});
