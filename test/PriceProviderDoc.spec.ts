import hre from "hardhat";

import { expect } from "chai";

const { ethers } = await hre.network.connect();
const to18 = (x: string | number) => ethers.parseUnits(String(x), 18);

describe("PriceProviderDocUsd + PriceProviderDocRbtc", () => {
  it("reverts on zero mocState", async () => {
    const DocUsd = await ethers.getContractFactory("PriceProviderDocUsd");
    const DocRbtc = await ethers.getContractFactory("PriceProviderDocRbtc");

    await expect(DocUsd.deploy(ethers.ZeroAddress)).to.be.revertedWith("mocState address is zero");
    await expect(DocRbtc.deploy(ethers.ZeroAddress)).to.be.revertedWith("mocState address is zero");
  });

  it("returns 1 when on coverage, a fraction when not", async () => {
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const btcPriceProvider = await MockProv.deploy(to18("200"), true);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);
    await moc.setBucketNBTC(to18("1"));
    await moc.setBucketNDoc(to18("200"));

    const DocUsd = await ethers.getContractFactory("PriceProviderDocUsd");
    const docUsd = await DocUsd.deploy(moc.target);

    const [priceBefore] = await docUsd.peek();
    expect(ethers.toBigInt(priceBefore)).to.equal(10n ** 18n); // min(1, 1*200/200) = 1

    await btcPriceProvider.setPriceUint(to18("100"), true);
    const [priceAfter, validAfter] = await docUsd.peek();
    expect(validAfter).to.equal(true);
    expect(ethers.toBigInt(priceAfter)).to.equal(500000000000000000n); // 0.5
  });

  it("returns usd/btc when on coverage, protocol's rbtc/doc when not", async () => {
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const btcPriceProvider = await MockProv.deploy(to18("100"), true);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);
    await moc.setBucketNBTC(to18("2")); // 2 RBTC
    await moc.setBucketNDoc(to18("100")); // 100 DOC

    const DocRbtc = await ethers.getContractFactory("PriceProviderDocRbtc");
    const docRbtc = await DocRbtc.deploy(moc.target);

    // On coverage:
    // - bucket ratio = 2/100 = 0.02 RBTC/DOC
    // - USD/BTC cap at BTC/USD=100 is 0.01
    // -> use cap (oracle-based): 0.01
    const [priceOnCoverage, validOnCoverage] = await docRbtc.peek();
    expect(validOnCoverage).to.equal(true);
    expect(ethers.toBigInt(priceOnCoverage)).to.equal(10000000000000000n);

    // BTC/USD drops to 25:
    // - USD/BTC cap becomes 0.04
    // - bucket ratio remains 0.02
    // -> use bucket ratio (protocol): 0.02
    await btcPriceProvider.setPriceUint(to18("25"), true);

    const [priceOffCoverage, validOffCoverage] = await docRbtc.peek();
    expect(validOffCoverage).to.equal(true);
    expect(ethers.toBigInt(priceOffCoverage)).to.equal(20000000000000000n);
  });

  it("keeps returning computed values but marks invalid when BTC oracle is invalid", async () => {
    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const btcPriceProvider = await MockProv.deploy(to18("100"), false);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);
    await moc.setBucketNBTC(to18("1"));
    await moc.setBucketNDoc(to18("200"));

    const DocUsd = await ethers.getContractFactory("PriceProviderDocUsd");
    const DocRbtc = await ethers.getContractFactory("PriceProviderDocRbtc");
    const docUsd = await DocUsd.deploy(moc.target);
    const docRbtc = await DocRbtc.deploy(moc.target);

    const [docUsdPrice, docUsdValid] = await docUsd.peek();
    expect(docUsdValid).to.equal(false);
    expect(ethers.toBigInt(docUsdPrice)).to.equal(500000000000000000n);

    const [docRbtcPrice, docRbtcValid] = await docRbtc.peek();
    expect(docRbtcValid).to.equal(false);
    expect(ethers.toBigInt(docRbtcPrice)).to.equal(5000000000000000n);
  });

  it("forwards getLastPublicationBlock from BTC price provider", async () => {
    const MockCPP = await ethers.getContractFactory("MockCoinPairPrice");
    const btcPriceProvider = await MockCPP.deploy(to18("100"), true, 12345);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);

    const DocUsd = await ethers.getContractFactory("PriceProviderDocUsd");
    const DocRbtc = await ethers.getContractFactory("PriceProviderDocRbtc");
    const docUsd = await DocUsd.deploy(moc.target);
    const docRbtc = await DocRbtc.deploy(moc.target);

    expect(await docUsd.getLastPublicationBlock()).to.equal(12345);
    expect(await docRbtc.getLastPublicationBlock()).to.equal(12345);

    await btcPriceProvider.setLastPublicationBlock(98765);
    expect(await docUsd.getLastPublicationBlock()).to.equal(98765);
    expect(await docRbtc.getLastPublicationBlock()).to.equal(98765);
  });
});
