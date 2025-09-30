import hre from "hardhat";

import { expect } from "chai";

const { ethers } = await hre.network.connect();

describe("BproUsdAggregatorV2Minimal", () => {
  const to18 = (x: string | number) => ethers.parseUnits(String(x), 18);

  it("reverts on zero address mocState", async () => {
    const Factory = await ethers.getContractFactory("BproUsdAggregatorV2Minimal");
    await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith("mocState address is zero");
  });

  it("returns latestAnswer in 8 decimals (truncated)", async () => {
    // 1) Deploy mock with a 18-decimal price
    //    Example: 1.234567890123456789 * 1e18
    const initial = to18("1.234567890123456789");

    // BTC provider: valid and non-zero (we only care about the validity gate)
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), true);

    const Mock = await ethers.getContractFactory("MockMoCState");
    const mock = await Mock.deploy(initial, prov);

    // 2) Deploy aggregator pointing to mock
    const Agg = await ethers.getContractFactory("BproUsdAggregatorV2Minimal");
    const agg = await Agg.deploy(mock.target);

    // 3) Call latestAnswer (int256 with 8 decimals)
    //    SCALE = 1e10, so expected = floor(initial / 1e10)
    const expected = initial / 10n ** 10n;
    const ans = await agg.latestAnswer();

    expect(ans).to.equal(expected);

    // 4) Change the mock price and re-check
    //    e.g. 1234.567890123456789 * 1e18
    const newPrice = to18("1234.567890123456789");
    await mock.setBproUsdPrice(newPrice);

    const expected2 = newPrice / 10n ** 10n;
    const ans2 = await agg.latestAnswer();

    expect(ans2).to.equal(expected2);
  });
});
