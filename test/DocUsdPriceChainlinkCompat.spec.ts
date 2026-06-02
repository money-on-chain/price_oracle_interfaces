import hre from "hardhat";

import { expect } from "chai";

const { ethers } = await hre.network.connect();
const to18 = (x: string | number) => ethers.parseUnits(String(x), 18);

describe("DocUsdPriceChainlinkCompat", () => {
  it("reverts on zero addresses or zero average block time", async () => {
    const Factory = await ethers.getContractFactory("DocUsdPriceChainlinkCompat");

    await expect(Factory.deploy(ethers.ZeroAddress, 24)).to.be.revertedWith(
      "mocState address is zero",
    );

    const MockProv = await ethers.getContractFactory("MockPriceProvider");
    const prov = await MockProv.deploy(to18("100"), true);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), prov.target);

    await expect(Factory.deploy(moc.target, 0)).to.be.revertedWith(
      "averageBlockTimeSeconds is zero",
    );
  });

  it("exposes a DOC/USD Chainlink-style feed with 8 decimals", async () => {
    const MockProv = await ethers.getContractFactory("MockCoinPairPrice");
    const btcPriceProvider = await MockProv.deploy(to18("100"), true, 1);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);
    await moc.setBucketNBTC(to18("1"));
    await moc.setBucketNDoc(to18("1"));

    const Factory = await ethers.getContractFactory("DocUsdPriceChainlinkCompat");
    const adapter = await Factory.deploy(moc.target, 24);

    expect(await adapter.decimals()).to.equal(8);
    expect(await adapter.description()).to.equal("DOC / USD");
    expect(await adapter.version()).to.equal(1);
    expect(await adapter.averageBlockTimeSeconds()).to.equal(24);

    const latestAnswer = await adapter.latestAnswer();
    expect(latestAnswer).to.equal(100000000n);

    const latestRoundData = await adapter.latestRoundData();
    expect(latestRoundData[0]).to.equal(1n);
    expect(latestRoundData[1]).to.equal(100000000n);
    expect(latestRoundData[4]).to.equal(1n);
  });

  it("truncates DOC/USD from 18 decimals to 8 decimals", async () => {
    const MockProv = await ethers.getContractFactory("MockCoinPairPrice");
    const btcPriceProvider = await MockProv.deploy(to18("1"), true, 5);

    const MockMoC = await ethers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);
    await moc.setBucketNBTC(to18("0.123456789012345678"));
    await moc.setBucketNDoc(to18("1"));

    const Factory = await ethers.getContractFactory("DocUsdPriceChainlinkCompat");
    const adapter = await Factory.deploy(moc.target, 24);

    const answer = await adapter.latestAnswer();
    expect(answer).to.equal(12345678n);
  });

  it("computes roundData timestamps from block cadence", async () => {
    const connected = await hre.network.connect();
    const { ethers: connectedEthers, networkHelpers } = connected;

    const MockProv = await connectedEthers.getContractFactory("MockCoinPairPrice");
    const btcPriceProvider = await MockProv.deploy(to18("100"), true, 7);

    const MockMoC = await connectedEthers.getContractFactory("MockMoCState");
    const moc = await MockMoC.deploy(to18("1"), btcPriceProvider.target);
    await moc.setBucketNBTC(to18("1"));
    await moc.setBucketNDoc(to18("1"));

    const Factory = await connectedEthers.getContractFactory("DocUsdPriceChainlinkCompat");
    const adapter = await Factory.deploy(moc.target, 24);

    const roundId = await adapter.getLastPublicationBlock();

    await networkHelpers.mine(9, { interval: 24 });

    const currentBlock = await connectedEthers.provider.getBlockNumber();
    const currentBlockData = await connectedEthers.provider.getBlock(currentBlock);
    const expectedUpdatedAt =
      BigInt(currentBlockData!.timestamp) - BigInt(currentBlock - Number(roundId)) * 24n;

    const roundData = await adapter.latestRoundData();
    expect(roundData[0]).to.equal(roundId);
    expect(roundData[2]).to.equal(expectedUpdatedAt);
    expect(roundData[3]).to.equal(expectedUpdatedAt);

    const currentRoundData = await adapter.getRoundData(roundId);
    expect(currentRoundData[1]).to.equal(roundData[1]);
    expect(currentRoundData[2]).to.equal(expectedUpdatedAt);

    await expect(adapter.getRoundData(roundId + 1n)).to.be.revertedWith("No data present");
  });
});
