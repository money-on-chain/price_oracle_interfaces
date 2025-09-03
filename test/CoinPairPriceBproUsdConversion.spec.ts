import hre from "hardhat";

import { expect } from "chai";

const { ethers } = await hre.network.connect();
const to18 = (x: string | number) => ethers.parseUnits(String(x), 18);

describe("CoinPairPriceBproUsdConversion", () => {
  it("reverts on zero addresses in constructor", async () => {
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const base = await MockCPP.deploy(to18("1"), true, 123);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), true);
    const moc = await MockMoC.deploy(to18("1"), prov.target);

    const Factory = await ethers.getContractFactory("CoinPairPriceBproUsdConversion");

    await expect(
      Factory.deploy(ethers.ZeroAddress, moc.target)
    ).to.be.revertedWith("coinpairprice address is zero");

    await expect(
      Factory.deploy(base.target, ethers.ZeroAddress)
    ).to.be.revertedWith("mocState address is zero");
  });

  it("returns derived price when all sources are valid", async () => {
    // Base coin pair price = 2e18
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const base = await MockCPP.deploy(to18("2"), true, 777);

    // BTC provider (we just need validity true)
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), true);

    // MoCState.bproUsdPrice = 3e18
    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("3"), prov.target);

    // Deploy the adapter
    const Factory = await ethers.getContractFactory("CoinPairPriceBproUsdConversion");
    const adapter = await Factory.deploy(base.target, moc.target);

    // Expected: (bproUsdPrice * coinpairPrice) / 1e18 = (3e18 * 2e18)/1e18 = 6e18
    const expected = (to18("3") * to18("2")) / (10n ** 18n);

    const [price, valid] = await adapter.peek();

    expect(valid).to.equal(true);
    expect(ethers.toBigInt(price)).to.equal(expected);
  });

  it("returns (0,false) if base coinpair returns invalid", async () => {
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const base = await MockCPP.deploy(to18("2"), false, 1000); // valid=false

    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), true);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("3"), prov.target);

    const Factory = await ethers.getContractFactory("CoinPairPriceBproUsdConversion");
    const adapter = await Factory.deploy(base.target, moc.target);

    const [price, valid] = await adapter.peek();
    expect(valid).to.equal(false);
    expect(ethers.toBigInt(price)).to.equal(0n);
  });

  it("returns (0,false) if BTC price provider is invalid", async () => {
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const base = await MockCPP.deploy(to18("2"), true, 1000);

    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), false); // valid=false

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("3"), prov.target);

    const Factory = await ethers.getContractFactory("CoinPairPriceBproUsdConversion");
    const adapter = await Factory.deploy(base.target, moc.target);

    const [price, valid] = await adapter.peek();
    expect(valid).to.equal(false);
    expect(ethers.toBigInt(price)).to.equal(0n);
  });

  it("forwards getLastPublicationBlock from the base oracle", async () => {
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const base = await MockCPP.deploy(to18("1"), true, 424242);

    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), true);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), prov.target);

    const Factory = await ethers.getContractFactory("CoinPairPriceBproUsdConversion");
    const adapter = await Factory.deploy(base.target, moc.target);

    const blk = await adapter.getLastPublicationBlock();
    expect(blk).to.equal(424242);

    // Update and re-check
    await base.setLastPublicationBlock(999999);
    const blk2 = await adapter.getLastPublicationBlock();
    expect(blk2).to.equal(999999);
  });

  it("truncates fractional part (no rounding) when (a*b)/1e18 has remainder", async () => {
    const { ethers } = await hre.network.connect();
    const to18 = (x: string | number) => ethers.parseUnits(String(x), 18);
  
    // Base oracle: start valid with some block number
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const base = await MockCPP.deploy(to18("1"), true, 111);
  
    // BTC provider: valid and non-zero (we only care about the validity gate)
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("50000"), true);
  
    // MoCState with BPro/USD price; luego lo ajustamos para forzar resto
    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), prov.target);
  
    const Factory = await ethers.getContractFactory("CoinPairPriceBproUsdConversion");
    const adapter = await Factory.deploy(base.target, moc.target);
  
    // Forzamos resto: a = 1e18 + 1, b = 1e18 + 1
    // (a*b)/1e18 = 1e18 + 2 + (1/1e18) -> floor => 1e18 + 2
    const a = to18("1") + 1n; // bproUsdPrice
    const b = to18("1") + 1n; // coinpair price
  
    await moc.setBproUsdPrice(a);
    await base.setPriceUint(b, true);
  
    const [price, valid] = await adapter.peek();
    expect(valid).to.equal(true);
  
    const expected = (a * b) / (10n ** 18n); // floor division (truncation)
    // Sanity: ensure there's remainder so we're really testing truncation
    expect((a * b) % (10n ** 18n)).to.not.equal(0n);
  
    expect(ethers.toBigInt(price)).to.equal(expected);
  });
  
});
