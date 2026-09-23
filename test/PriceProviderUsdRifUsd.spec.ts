import hre from "hardhat";

import { expect } from "chai";

const { ethers, networkHelpers } = await hre.network.connect();
const to18 = (x: string | number) => ethers.parseUnits(String(x), 18);
const runMainnetFork = process.env.RUN_RSK_MAINNET_FORK === "1";
const describeUnit = runMainnetFork ? describe.skip : describe;

async function deploySystem({
  combinedCoverage = to18("1"),
  rifValid = true,
  btcValid = true,
  rifPublicationBlock = 100,
  btcPublicationBlock = 120,
}: {
  combinedCoverage?: bigint;
  rifValid?: boolean;
  btcValid?: boolean;
  rifPublicationBlock?: number;
  btcPublicationBlock?: number;
} = {}) {
  const PriceInfo = await ethers.getContractFactory("MockPriceProviderInfo");
  const rifPrice = to18("0.08");
  const btcPrice = to18("100");
  const rifOracle = await PriceInfo.deploy(rifPrice, rifValid, rifPublicationBlock);
  const PublicPriceInfo = await ethers.getContractFactory("MockPublicPriceProviderInfo");
  const btcOracle = await PublicPriceInfo.deploy(btcPrice, btcValid, btcPublicationBlock);

  const MockMoC = await ethers.getContractFactory("MockMoCState");
  const mocState = await MockMoC.deploy(to18("1"), btcOracle.target);
  await mocState.setBucketNBTC(to18("1"));
  await mocState.setBucketNDoc(to18("100"));

  const DocProvider = await ethers.getContractFactory("PriceProviderDocUsd");
  const docProvider = await DocProvider.deploy(mocState.target);

  const Bucket = await ethers.getContractFactory("MockMocBucket");
  const rifBucket = await Bucket.deploy([rifOracle.target]);
  const docBucket = await Bucket.deploy([docProvider.target]);
  await rifBucket.setCoverage(combinedCoverage);
  await docBucket.setCoverage(combinedCoverage);
  await rifBucket.setExpectedPrices([rifPrice]);
  await docBucket.setExpectedPrices([to18("1")]);

  const Guard = await ethers.getContractFactory("MockMocMultiCollateralGuard");
  const guard = await Guard.deploy(combinedCoverage, 0, 0);
  await guard.addBucket(rifBucket.target);
  await guard.addBucket(docBucket.target);
  await guard.setExpectedComponentPrice(0, 0, rifPrice);
  await guard.setExpectedComponentPrice(1, 0, to18("1"));

  const Factory = await ethers.getContractFactory("PriceProviderUsdRifUsd");
  const provider = await Factory.deploy(guard.target, docBucket.target);

  return {
    btcOracle,
    docBucket,
    docProvider,
    guard,
    mocState,
    provider,
    rifBucket,
    rifOracle,
    rifPrice,
  };
}

describeUnit("PriceProviderUsdRifUsd", () => {
  it("validates the guard and known DOC bucket", async () => {
    const Factory = await ethers.getContractFactory("PriceProviderUsdRifUsd");

    await expect(Factory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWith(
      "guard address is zero",
    );

    const Guard = await ethers.getContractFactory("MockMocMultiCollateralGuard");
    const guard = await Guard.deploy(to18("1"), 0, 0);
    await expect(Factory.deploy(guard.target, ethers.ZeroAddress)).to.be.revertedWith(
      "DOC bucket address is zero",
    );
  });

  it("uses typed getPriceInfo for RIF and the existing DOC provider", async () => {
    const { provider, rifOracle } = await deploySystem({ combinedCoverage: to18("1.4") });

    await expect(rifOracle.peek()).to.be.revertedWith("Address is not whitelisted");

    const [price, valid, publicationBlock] = await provider.getPriceInfo();
    expect(price).to.equal(to18("1"));
    expect(valid).to.equal(true);
    expect(publicationBlock).to.equal(100n);

    const [peekPrice, peekValid] = await provider.peek();
    expect(ethers.toBigInt(peekPrice)).to.equal(price);
    expect(peekValid).to.equal(valid);
  });

  it("returns combined coverage below one instead of masking a lost peg", async () => {
    const { provider } = await deploySystem({
      combinedCoverage: to18("0.734567890123456789"),
    });

    const [price, valid] = await provider.peek();
    expect(ethers.toBigInt(price)).to.equal(to18("0.734567890123456789"));
    expect(valid).to.equal(true);
  });

  it("uses stale last prices and marks the result invalid", async () => {
    const directStale = await deploySystem({
      combinedCoverage: to18("0.81"),
      rifValid: false,
    });
    const [directPrice, directValid] = await directStale.provider.peek();
    expect(ethers.toBigInt(directPrice)).to.equal(to18("0.81"));
    expect(directValid).to.equal(false);

    const btcStale = await deploySystem({
      combinedCoverage: to18("0.82"),
      btcValid: false,
    });
    const [docPrice, docValid] = await btcStale.provider.peek();
    expect(ethers.toBigInt(docPrice)).to.equal(to18("0.82"));
    expect(docValid).to.equal(false);
  });

  it("skips the guard when every bucket is covered, including exactly one", async () => {
    const { guard, provider, rifBucket } = await deploySystem();
    await rifBucket.setCoverage(to18("12"));
    // A reverting guard makes accidental use of the expensive path observable.
    await guard.setRevertOnCalculation(true);
    expect(await provider.getPriceInfo()).to.deep.equal([to18("1"), true, 100n]);
    expect(await provider.peek()).to.deep.equal([ethers.toBeHex(to18("1"), 32), true]);
  });

  it("treats empty buckets as covered, including an entirely empty protocol", async () => {
    const { guard, provider, rifBucket, docBucket } = await deploySystem();
    await guard.setRevertOnCalculation(true);
    await rifBucket.setCoverage(ethers.MaxUint256);
    expect((await provider.getPriceInfo()).price).to.equal(to18("1"));
    await docBucket.setCoverage(ethers.MaxUint256);
    expect((await provider.getPriceInfo()).price).to.equal(to18("1"));
  });

  for (const staleSource of ["rif", "doc", "both"]) {
    it(`preserves validity and age on the early return with stale ${staleSource} prices`, async () => {
      const { guard, provider } = await deploySystem({
        rifValid: staleSource === "doc",
        btcValid: staleSource === "rif",
        rifPublicationBlock: 100,
        btcPublicationBlock: 90,
      });
      await guard.setRevertOnCalculation(true);
      expect(await provider.getPriceInfo()).to.deep.equal([to18("1"), false, 90n]);
    });
  }

  for (const combinedCoverage of [to18("1.1"), to18("0.8")]) {
    it(`uses combined coverage ${combinedCoverage} when the last bucket is undercovered`, async () => {
      const { guard, provider, rifBucket, docBucket } = await deploySystem({ combinedCoverage });
      await rifBucket.setCoverage(to18("2"));
      await docBucket.setCoverage(to18("1") - 1n);
      await guard.setRevertOnCalculation(true);
      await expect(provider.peek()).to.be.revertedWith("unexpected guard calculation");
      await guard.setRevertOnCalculation(false);
      const expected = combinedCoverage > to18("1") ? to18("1") : combinedCoverage;
      expect((await provider.getPriceInfo()).price).to.equal(expected);
    });
  }

  it("stops bucket checks after the first shortfall but still fetches every price", async () => {
    const { provider, rifBucket, docBucket } = await deploySystem({
      combinedCoverage: to18("0.8"),
      btcValid: false,
      btcPublicationBlock: 90,
    });
    await rifBucket.setCoverage(to18("0.9"));
    await docBucket.setRevertOnCoverage(true);
    // The guard also verifies that it receives both complete price rows.
    expect(await provider.getPriceInfo()).to.deep.equal([to18("0.8"), false, 90n]);
  });

  it("caches topology and permissionlessly refreshes a changed provider", async () => {
    const { guard, provider, rifBucket, rifOracle, rifPrice } = await deploySystem();
    expect(await provider.getCachedBucketAmount()).to.equal(2n);
    expect(await provider.getCachedTpAmount(0)).to.equal(1n);
    expect(await provider.cachedPriceProviders(0, 0)).to.equal(rifOracle.target);

    const PriceInfo = await ethers.getContractFactory("MockPriceProviderInfo");
    const replacementPrice = to18("0.09");
    const replacement = await PriceInfo.deploy(replacementPrice, true, 130);
    await rifBucket.setPriceProvider(0, replacement.target);
    await rifBucket.setExpectedPrices([replacementPrice]);
    await guard.setExpectedComponentPrice(0, 0, replacementPrice);

    expect(await provider.cachedPriceProviders(0, 0)).to.equal(rifOracle.target);
    const previousHash = await provider.topologyHash();

    await expect(provider.refreshTopology()).to.emit(provider, "TopologyRefreshed");
    expect(await provider.cachedPriceProviders(0, 0)).to.equal(replacement.target);
    expect(await provider.topologyHash()).not.to.equal(previousHash);

    const [price, valid, publicationBlock] = await provider.getPriceInfo();
    expect(price).to.equal(to18("1"));
    expect(valid).to.equal(true);
    expect(publicationBlock).to.equal(120n);
    expect(rifPrice).not.to.equal(replacementPrice);
  });
});
async function deployChainlinkSystem(combinedCoverage: bigint, valid = true) {
  const currentBlock = await ethers.provider.getBlockNumber();
  const publicationBlock = Math.max(1, currentBlock - 2);

  const PriceInfo = await ethers.getContractFactory("MockPriceProviderInfo");
  const rifPrice = to18("0.08");
  const rifOracle = await PriceInfo.deploy(rifPrice, valid, publicationBlock);
  const PublicPriceInfo = await ethers.getContractFactory("MockPublicPriceProviderInfo");
  const btcOracle = await PublicPriceInfo.deploy(to18("100"), true, publicationBlock + 1);

  const MockMoC = await ethers.getContractFactory("MockMoCState");
  const mocState = await MockMoC.deploy(to18("1"), btcOracle.target);
  await mocState.setBucketNBTC(to18("1"));
  await mocState.setBucketNDoc(to18("100"));

  const DocProvider = await ethers.getContractFactory("PriceProviderDocUsd");
  const docProvider = await DocProvider.deploy(mocState.target);

  const Bucket = await ethers.getContractFactory("MockMocBucket");
  const rifBucket = await Bucket.deploy([rifOracle.target]);
  const docBucket = await Bucket.deploy([docProvider.target]);
  await rifBucket.setCoverage(combinedCoverage);
  await docBucket.setCoverage(combinedCoverage);
  await rifBucket.setExpectedPrices([rifPrice]);
  await docBucket.setExpectedPrices([to18("1")]);

  const Guard = await ethers.getContractFactory("MockMocMultiCollateralGuard");
  const guard = await Guard.deploy(combinedCoverage, 0, 0);
  await guard.addBucket(rifBucket.target);
  await guard.addBucket(docBucket.target);
  await guard.setExpectedComponentPrice(0, 0, rifPrice);
  await guard.setExpectedComponentPrice(1, 0, to18("1"));

  const Provider = await ethers.getContractFactory("PriceProviderUsdRifUsd");
  const provider = await Provider.deploy(guard.target, docBucket.target);

  const Adapter = await ethers.getContractFactory("UsdRifUsdPriceChainlinkCompat");
  const adapter = await Adapter.deploy(provider.target, 24);
  return { adapter, provider, publicationBlock };
}

describeUnit("UsdRifUsdPriceChainlinkCompat", () => {
  it("validates constructor arguments", async () => {
    const Factory = await ethers.getContractFactory("UsdRifUsdPriceChainlinkCompat");

    await expect(Factory.deploy(ethers.ZeroAddress, 24)).to.be.revertedWith(
      "price provider address is zero",
    );

    const { provider } = await deployChainlinkSystem(to18("1"));
    await expect(Factory.deploy(provider.target, 0)).to.be.revertedWith(
      "averageBlockTimeSeconds is zero",
    );
  });

  it("exposes and truncates the core USDRIF/USD price to 8 decimals", async () => {
    const onPeg = await deployChainlinkSystem(to18("1.75"));
    expect(await onPeg.adapter.decimals()).to.equal(8);
    expect(await onPeg.adapter.description()).to.equal("USDRIF / USD");
    expect(await onPeg.adapter.version()).to.equal(1);
    expect(await onPeg.adapter.latestAnswer()).to.equal(100000000n);

    const offPeg = await deployChainlinkSystem(to18("0.123456789012345678"));
    expect(await offPeg.adapter.latestAnswer()).to.equal(12345678n);
  });

  it("keeps returning the stale last computed answer", async () => {
    const { adapter, provider } = await deployChainlinkSystem(to18("0.82"), false);

    const [, valid] = await provider.peek();
    expect(valid).to.equal(false);
    expect(await adapter.latestAnswer()).to.equal(82000000n);
  });

  it("uses the oldest source publication as the round and estimates its timestamp", async () => {
    const { adapter, publicationBlock } = await deployChainlinkSystem(to18("0.9"));

    await networkHelpers.mine(4, { interval: 24 });

    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const latestBlock = await ethers.provider.getBlock(latestBlockNumber);
    const expectedUpdatedAt =
      BigInt(latestBlock!.timestamp) - BigInt(latestBlockNumber - publicationBlock) * 24n;

    const roundData = await adapter.latestRoundData();
    expect(roundData[0]).to.equal(BigInt(publicationBlock));
    expect(roundData[1]).to.equal(90000000n);
    expect(roundData[2]).to.equal(expectedUpdatedAt);
    expect(roundData[3]).to.equal(expectedUpdatedAt);
    expect(roundData[4]).to.equal(BigInt(publicationBlock));

    expect((await adapter.getRoundData(BigInt(publicationBlock)))[1]).to.equal(90000000n);
    await expect(adapter.getRoundData(BigInt(publicationBlock + 1))).to.be.revertedWith(
      "No data present",
    );
  });
});
const GUARD_ADDRESS = "0x0237Ad1f0831b479a344E56646BC48B0885cF46F";
const DOC_BUCKET_ADDRESS = "0x697535055Aa7AfD2C280523C7B062b1F05284661";
const ONE = 10n ** 18n;
const AVERAGE_BLOCK_TIME_SECONDS = 24;

const guardAbi = [
  "function getBucketAmount() view returns (uint256)",
  "function buckets(uint256) view returns (address)",
  "function calcCombinedCglbWithPrices(uint256[][]) view returns (uint256)",
];
const bucketAbi = [
  "function getTpAmount() view returns (uint256)",
  "function pegContainer(uint256) view returns (uint256 nTP, address priceProvider)",
];
const priceInfoAbi = [
  "function getPriceInfo() view returns (uint256 price, bool valid, uint256 lastPublicationBlock)",
];
const docProviderAbi = [
  "function mocState() view returns (address)",
  "function btcPriceProvider() view returns (address)",
];
const mocStateAbi = [
  "function getBucketNBTC(bytes32) view returns (uint256)",
  "function getBucketNDoc(bytes32) view returns (uint256)",
];

const describeFork = runMainnetFork ? describe : describe.skip;

describeFork("PriceProviderUsdRifUsd current Rootstock mainnet fork", function () {
  this.timeout(180_000);

  it("matches the live guard calculation and exposes a reasonable Chainlink answer", async () => {
    const forkBlock = await ethers.provider.getBlockNumber();
    expect(forkBlock).to.be.greaterThan(9_000_000);

    const guard = new ethers.Contract(GUARD_ADDRESS, guardAbi, ethers.provider);
    const bucketAmount = Number(await guard.getBucketAmount());
    expect(bucketAmount).to.be.greaterThanOrEqual(2);

    const Provider = await ethers.getContractFactory("PriceProviderUsdRifUsd");
    const provider = await Provider.deploy(GUARD_ADDRESS, DOC_BUCKET_ADDRESS);
    await provider.waitForDeployment();

    expect(await provider.getCachedBucketAmount()).to.equal(BigInt(bucketAmount));

    const prices: bigint[][] = [];
    let allValid = true;
    let oldestPublicationBlock = (1n << 256n) - 1n;
    let docBucketFound = false;

    for (let j = 0; j < bucketAmount; j++) {
      const bucketAddress: string = await guard.buckets(j);
      const bucket = new ethers.Contract(bucketAddress, bucketAbi, ethers.provider);
      const tpAmount = Number(await bucket.getTpAmount());
      expect(await provider.cachedBuckets(j)).to.equal(bucketAddress);
      expect(await provider.getCachedTpAmount(j)).to.equal(BigInt(tpAmount));

      const bucketPrices: bigint[] = [];
      for (let i = 0; i < tpAmount; i++) {
        const [, configuredProvider] = await bucket.pegContainer(i);
        expect(await provider.cachedPriceProviders(j, i)).to.equal(configuredProvider);

        let price: bigint;
        let valid: boolean;
        let publicationBlock: bigint;

        if (bucketAddress.toLowerCase() === DOC_BUCKET_ADDRESS.toLowerCase()) {
          docBucketFound = true;
          const docProvider = new ethers.Contract(
            configuredProvider,
            docProviderAbi,
            ethers.provider,
          );
          const mocStateAddress: string = await docProvider.mocState();
          const btcProviderAddress: string = await docProvider.btcPriceProvider();
          const btcProvider = new ethers.Contract(
            btcProviderAddress,
            priceInfoAbi,
            ethers.provider,
          );
          const btcInfo = await btcProvider.getPriceInfo();
          const mocState = new ethers.Contract(mocStateAddress, mocStateAbi, ethers.provider);
          const c0 = ethers.encodeBytes32String("C0");
          const nRbtc: bigint = await mocState.getBucketNBTC(c0);
          const nDoc: bigint = await mocState.getBucketNDoc(c0);

          price = nDoc === 0n ? ONE : (nRbtc * btcInfo.price) / nDoc;
          if (price > ONE) price = ONE;
          valid = btcInfo.valid;
          publicationBlock = btcInfo.lastPublicationBlock;
        } else {
          const directProvider = new ethers.Contract(
            configuredProvider,
            priceInfoAbi,
            ethers.provider,
          );
          const info = await directProvider.getPriceInfo();
          price = info.price;
          valid = info.valid;
          publicationBlock = info.lastPublicationBlock;
        }

        bucketPrices.push(price);
        allValid = allValid && valid && price !== 0n;
        if (publicationBlock < oldestPublicationBlock) {
          oldestPublicationBlock = publicationBlock;
        }
      }
      prices.push(bucketPrices);
    }

    expect(docBucketFound).to.equal(true);

    const combinedCoverage: bigint = await guard.calcCombinedCglbWithPrices(prices);
    const expectedPrice = combinedCoverage > ONE ? ONE : combinedCoverage;
    const info = await provider.getPriceInfo();

    expect(info.price).to.equal(expectedPrice);
    expect(info.valid).to.equal(allValid);
    expect(info.lastPublicationBlock).to.equal(oldestPublicationBlock);
    expect(info.price).to.be.greaterThan(ONE / 2n);
    expect(info.price).to.be.lessThanOrEqual(ONE);

    const Adapter = await ethers.getContractFactory("UsdRifUsdPriceChainlinkCompat");
    const adapter = await Adapter.deploy(provider.target, AVERAGE_BLOCK_TIME_SECONDS);
    await adapter.waitForDeployment();

    const roundData = await adapter.latestRoundData();
    const roundInfo = await provider.getPriceInfo();
    expect(roundData.answer).to.equal(expectedPrice / 10n ** 10n);
    expect(roundData.roundId).to.equal(roundInfo.lastPublicationBlock);
    expect(roundData.answeredInRound).to.equal(roundInfo.lastPublicationBlock);

    const currentBlock = await ethers.provider.getBlock("latest");
    expect(roundData.updatedAt).to.be.lessThanOrEqual(BigInt(currentBlock!.timestamp));
    expect(roundData.updatedAt).to.be.greaterThan(0n);

    // Transactions execute locally on the fork only. Restore the snapshot after
    // each measurement so every entry sees identical state and oracle age.
    const [signer] = await ethers.getSigners();
    const gas: Record<string, string> = {};
    for (const [contract, method] of [
      [provider, "peek"],
      [provider, "getPriceInfo"],
      [adapter, "latestAnswer"],
      [adapter, "latestRoundData"],
    ] as const) {
      const snapshot = await ethers.provider.send("evm_snapshot", []);
      try {
        const tx = await signer.sendTransaction({
          to: contract.target,
          data: contract.interface.encodeFunctionData(method as never),
          gasLimit: 1_000_000,
        });
        const receipt = await tx.wait();
        gas[method] = receipt!.gasUsed.toString();
      } finally {
        await ethers.provider.send("evm_revert", [snapshot]);
      }
    }
    console.log("USDRIF fork gas (transaction total)", { forkBlock, ...gas });

    // No oracle publications occur on the isolated fork. Expiring both validity
    // windows must preserve the last prices and their actual source age.
    await networkHelpers.mine(21);
    const staleInfo = await provider.getPriceInfo();
    expect(staleInfo.price).to.equal(expectedPrice);
    expect(staleInfo.valid).to.equal(false);
    expect(staleInfo.lastPublicationBlock).to.equal(oldestPublicationBlock);
    expect(await provider.peek()).to.deep.equal([ethers.toBeHex(expectedPrice, 32), false]);
    expect((await adapter.latestRoundData()).roundId).to.equal(oldestPublicationBlock);
    const staleTx = await signer.sendTransaction({
      to: provider.target,
      data: provider.interface.encodeFunctionData("peek"),
      gasLimit: 1_000_000,
    });
    console.log("USDRIF fork stale fallback peek gas", (await staleTx.wait())!.gasUsed.toString());
  });
});
