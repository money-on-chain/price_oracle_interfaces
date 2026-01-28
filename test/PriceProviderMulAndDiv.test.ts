import { network } from "hardhat";

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import { expect } from "chai";
import { parseEther } from "ethers";

import {
  MockCoinPairPrice,
  MockCoinPairPrice__factory,
  PriceProviderDiv__factory,
  PriceProviderInverse__factory,
  PriceProviderMul__factory,
  PriceProviderMul3__factory,
} from "typechain-types";

describe("Multiplying and Dividing Oracles", () => {
  let oracleTwelve: MockCoinPairPrice;
  let oracleSix: MockCoinPairPrice;
  let oracleOld: MockCoinPairPrice;
  let oracleZero: MockCoinPairPrice;
  let deployer: HardhatEthersSigner;

  before(async () => {
    const connected = await network.connect();
    [deployer] = await connected.ethers.getSigners();
    const factory = new MockCoinPairPrice__factory(deployer);

    oracleTwelve = await factory.deploy(parseEther("12"), true, 100n);
    oracleSix = await factory.deploy(parseEther("6"), true, 100n);
    oracleOld = await factory.deploy(parseEther("3"), false, 1n);
    oracleZero = await factory.deploy(parseEther("0"), true, 100n);
  });

  describe("When multiplying two providers", () => {
    it("Multiplies two providers", async () => {
      const oracle = await new PriceProviderMul__factory(deployer).deploy(oracleTwelve, oracleSix);
      expect(await oracle.getPrice()).to.eq(parseEther("72"));
      expect(await oracle.getIsValid()).to.be.true;
      expect(await oracle.getLastPublicationBlock()).to.equal(100);
    });
    it("Uses boolean AND for validity", async () => {
      const oracle = await new PriceProviderMul__factory(deployer).deploy(oracleTwelve, oracleOld);
      expect(await oracle.getIsValid()).to.be.false;
      expect(await oracle.getPrice()).to.eq(parseEther("36"));
    });
    it("Uses oldest block as latest", async () => {
      const oracle = await new PriceProviderMul__factory(deployer).deploy(oracleSix, oracleOld);
      expect(await oracle.getLastPublicationBlock()).to.equal(1);
      expect(await oracle.getPrice()).to.eq(parseEther("18"));
    });
  });

  describe("When dividing two providers", () => {
    it("Divides two providers", async () => {
      const oracle = await new PriceProviderDiv__factory(deployer).deploy(oracleTwelve, oracleSix);
      expect(await oracle.getPrice()).to.eq(parseEther("2"));
      expect(await oracle.getIsValid()).to.be.true;
      expect(await oracle.getLastPublicationBlock()).to.equal(100);
    });

    it("Uses boolean AND for validity", async () => {
      const oracle = await new PriceProviderDiv__factory(deployer).deploy(oracleTwelve, oracleOld);
      expect(await oracle.getIsValid()).to.be.false;
      expect(await oracle.getPrice()).to.eq(parseEther("4"));
    });

    it("Uses oldest block as latest", async () => {
      const oracle = await new PriceProviderDiv__factory(deployer).deploy(oracleSix, oracleOld);
      expect(await oracle.getLastPublicationBlock()).to.equal(1);
      expect(await oracle.getPrice()).to.eq(parseEther("2"));
    });
  });

  describe("When multiplying three providers", () => {
    it("Multiplies three providers", async () => {
      const oracle = await new PriceProviderMul3__factory(deployer).deploy(
        oracleTwelve,
        oracleSix,
        oracleSix
      );
      expect(await oracle.getPrice()).to.eq(parseEther("432"));
      expect(await oracle.getIsValid()).to.be.true;
      expect(await oracle.getLastPublicationBlock()).to.equal(100);
    });

    it("Uses boolean AND for validity", async () => {
      const oracle = await new PriceProviderMul3__factory(deployer).deploy(
        oracleTwelve,
        oracleSix,
        oracleOld
      );
      expect(await oracle.getIsValid()).to.be.false;
      expect(await oracle.getPrice()).to.eq(parseEther("216"));
    });

    it("Uses oldest block as latest", async () => {
      const oracle = await new PriceProviderMul3__factory(deployer).deploy(
        oracleSix,
        oracleOld,
        oracleTwelve
      );
      expect(await oracle.getLastPublicationBlock()).to.equal(1);
      expect(await oracle.getPrice()).to.eq(parseEther("216"));
    });
  });

  describe("When inverting a provider", () => {
    it("Inverts the provider price", async () => {
      const oracle = await new PriceProviderInverse__factory(deployer).deploy(oracleTwelve);
      expect(await oracle.getPrice()).to.eq(parseEther("0.083333333333333333"));
      expect(await oracle.getIsValid()).to.be.true;
      expect(await oracle.getLastPublicationBlock()).to.equal(100);
    });

    it("Uses base provider validity", async () => {
      const oracle = await new PriceProviderInverse__factory(deployer).deploy(oracleOld);
      expect(await oracle.getIsValid()).to.be.false;
      expect(await oracle.getPrice()).to.eq(parseEther("0.333333333333333333"));
    });

    it("Returns zero when the base price is zero", async () => {
      const oracle = await new PriceProviderInverse__factory(deployer).deploy(oracleZero);
      expect(await oracle.getIsValid()).to.be.true;
      expect(await oracle.getPrice()).to.equal(0);
    });
  });
});
