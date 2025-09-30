import { network } from "hardhat";

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import { expect } from "chai";
import { parseEther } from "ethers";

import {
  MockCoinPairPrice,
  MockCoinPairPrice__factory,
  PriceProviderDiv__factory,
  PriceProviderMul__factory,
} from "typechain-types";

describe("Multiplying and Dividing Oracles", () => {
  let oracleTwelve: MockCoinPairPrice;
  let oracleSix: MockCoinPairPrice;
  let oracleOld: MockCoinPairPrice;
  let deployer: HardhatEthersSigner;

  before(async () => {
    const connected = await network.connect();
    [deployer] = await connected.ethers.getSigners();
    const factory = new MockCoinPairPrice__factory(deployer);

    oracleTwelve = await factory.deploy(parseEther("12"), true, 100n);
    oracleSix = await factory.deploy(parseEther("6"), true, 100n);
    oracleOld = await factory.deploy(parseEther("3"), false, 1n);
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
});
