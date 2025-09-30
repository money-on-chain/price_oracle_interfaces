import { network } from "hardhat";

import { HardhatEthersProvider, HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { NetworkHelpers } from "@nomicfoundation/hardhat-network-helpers/types";
import type { IgnitionModule, IgnitionModuleResult } from "@nomicfoundation/ignition-core";
import UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import NFTDescriptor from "@uniswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json";
import NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import NonFungibleTokenPositionDescriptor from "@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json";
import SwapRouter from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import { expect } from "chai";
import { parseEther, encodeBytes32String, Contract } from "ethers";

import {
  MockPriceProvider__factory,
  UniswapV3Oracle,
  UniswapV3Oracle__factory,
  UniswapV3OracleUSD__factory,
} from "typechain-types";

describe("UniswapV3 based oracles", () => {
  let provider: HardhatEthersProvider,
    deployer: HardhatEthersSigner,
    deployment: any,
    btcUsdPool: Contract,
    networkHelpers: NetworkHelpers,
    btcUsdOracle: UniswapV3Oracle,
    usdBtcOracle: UniswapV3Oracle,
    usdDocOracle: UniswapV3Oracle,
    docUsdOracle: UniswapV3Oracle;

  before(async () => {
    const connected = await network.connect();

    provider = connected.ethers.provider;
    networkHelpers = connected.networkHelpers;

    [deployer] = await connected.ethers.getSigners();

    deployment = await connected.ignition.deploy(DeployUniswapAndPools);
    const { wrbtc, usdt, doc } = deployment;

    // Mining 3000 seconds worth of blocks, so that the pool can
    // deliver a twap from 1800 seconds ago.
    await networkHelpers.mine(100, { interval: 30 });

    const makeOracles = async (base: any, quote: any) => {
      const pool = await deployment.uniswapFactory.getPool(base, quote, 3000);
      const factory = new UniswapV3Oracle__factory(deployer);
      return [
        pool,
        await factory.deploy(pool, 1800, quote),
        await factory.deploy(pool, 1800, base),
      ];
    };

    [btcUsdPool, btcUsdOracle, usdBtcOracle] = await makeOracles(wrbtc, usdt);
    [, usdDocOracle, docUsdOracle] = await makeOracles(usdt, doc);
  });

  it("gets base and quote prices", async () => {
    const assertOraclePrice = async (oracle: UniswapV3Oracle, price: string) =>
      expect(await oracle.getPrice()).to.equal(parseEther(price));

    // The initial btcusd price is 100, but uniswap stores the closest tick.
    // The 1:1 ratio between doc and usd can be stored precisely though.
    await assertOraclePrice(btcUsdOracle, "99.999955936218778826");
    await assertOraclePrice(usdBtcOracle, "0.010000004406380063");
    await assertOraclePrice(usdDocOracle, "1");
    await assertOraclePrice(docUsdOracle, "1");
  });

  it("always returns the last block as the last update", async () => {
    await provider.send("evm_setAutomine", [false]);

    const thisBlock = await provider.getBlockNumber();
    expect(await btcUsdOracle.getLastPublicationBlock()).to.equal(thisBlock);
    expect(await btcUsdOracle.getIsValid()).to.be.true;

    const nextBlock = thisBlock + 100;
    await networkHelpers.mineUpTo(nextBlock);
    expect(await btcUsdOracle.getLastPublicationBlock()).to.equal(nextBlock);
    expect(await btcUsdOracle.getIsValid()).to.be.true;

    await provider.send("evm_setAutomine", [true]);
  });

  describe("when fetching a pool as USD", () => {
    it("multiplies the pool price using the price provider", async () => {
      // The oracle converts the usdbtc price back to usd, so price should be close to 1.
      const oracle = await new UniswapV3OracleUSD__factory(deployer).deploy(
        btcUsdPool,
        1800,
        deployment.wrbtc,
        btcUsdOracle,
      );
      expect(await oracle.getPrice()).to.eq(parseEther("0.999999999999999926"));
    });

    it("is not valid if the BTCUSD price provider isn't", async () => {
      // A price of 100 is used so the actual price is going to be close to 1.
      const invalidPrice = await new MockPriceProvider__factory(deployer).deploy(
        parseEther("100"),
        false,
      );
      const oracle = await new UniswapV3OracleUSD__factory(deployer).deploy(
        btcUsdPool,
        1800,
        deployment.wrbtc,
        invalidPrice,
      );
      expect(await oracle.getIsValid()).to.be.false;
      expect(await oracle.getPrice()).to.eq(parseEther("1.000000440638006300"));
    });
  });
});

const DeployUniswapAndPools: IgnitionModule<
  "DeployUniswapAndPools",
  string,
  IgnitionModuleResult<string>
> = buildModule("DeployUniswapAndPools", (m: any) => {
  const feeTier = 3000;

  const priceForUniswap = (price: number) =>
    BigInt(Math.floor(Math.sqrt(price) * Number(1n << 96n)));

  const uniswapFactory = m.contract("UniswapV3Factory", UniswapV3Factory);
  const wrbtc = m.contract("WETH9", [], { id: "CreateWRBTC" });
  const usdt = m.contract("WETH9", [], { id: "CreateUSDT" });
  const doc = m.contract("WETH9", [], { id: "CreateDOC" });

  const label = encodeBytes32String("WRBTC");
  const nftDescriptor = m.library("NFTDescriptor", NFTDescriptor);
  const uniswapDescriptor = m.contract(
    "NonfungibleTokenPositionDescriptor",
    NonFungibleTokenPositionDescriptor,
    [wrbtc, label],
    {
      libraries: {
        "contracts/libraries/NFTDescriptor.sol:NFTDescriptor": nftDescriptor,
      },
    },
  );
  const uniswapPositionManager = m.contract(
    "NonfungiblePositionManager",
    NonfungiblePositionManager,
    [uniswapFactory, wrbtc, uniswapDescriptor],
  );
  const uniswapRouter = m.contract("SwapRouter", SwapRouter, [uniswapFactory, wrbtc]);

  m.call(
    uniswapPositionManager,
    "createAndInitializePoolIfNecessary",
    [wrbtc, usdt, feeTier, priceForUniswap(100)],
    { id: `wrbtcUsdt_createAndInitializePoolIfNecessary`, after: [uniswapRouter] },
  );

  m.call(
    uniswapPositionManager,
    "createAndInitializePoolIfNecessary",
    [doc, usdt, feeTier, priceForUniswap(1)],
    { id: `usdtDoc_createAndInitializePoolIfNecessary`, after: [uniswapRouter] },
  );

  return { wrbtc, usdt, doc, uniswapFactory };
});
