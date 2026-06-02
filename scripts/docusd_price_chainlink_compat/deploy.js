import fs from "fs";
import hre from "hardhat";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function selectedNetworkName(hre_) {
  return hre_.globalOptions?.network ?? process.env.HARDHAT_NETWORK ?? "hardhat";
}

function defaultConfigPath(root, networkName) {
  return path.join(root, "config", "docusd_price_chainlink_compat", `deployConfig-${networkName}.json`);
}

function resolveConfigPath(hre_, root) {
  const fromEnv = process.env.DEPLOY_CONFIG_PATH;
  return fromEnv
    ? path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(fromEnv)
    : defaultConfigPath(root, selectedNetworkName(hre_));
}

function loadConfigOrDie(cfgPath) {
  if (!fs.existsSync(cfgPath)) throw new Error(`Config not found: ${cfgPath}`);
  return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
}

function assertAddress(name, value) {
  if (typeof value !== "string" || !value.startsWith("0x") || value.length < 10) {
    throw new Error(`Invalid ${name} address in config: ${value}`);
  }
}

async function main() {
  const { ethers } = await hre.network.connect();

  const net = selectedNetworkName(hre);
  const cfgPath = resolveConfigPath(hre, repoRoot);
  const cfg = loadConfigOrDie(cfgPath);

  const [signer] = await ethers.getSigners();
  const from = await signer.getAddress();

  console.log("Selected network:", net);
  console.log("Config file:", cfgPath);
  console.log("Deployer:", from);
  console.log("Balance (wei):", (await ethers.provider.getBalance(from)).toString());

  assertAddress("MoCState", cfg.MoCState);
  if (typeof cfg.averageBlockTimeSeconds !== "number" || cfg.averageBlockTimeSeconds <= 0) {
    throw new Error(`Invalid averageBlockTimeSeconds in config: ${cfg.averageBlockTimeSeconds}`);
  }

  console.log("MoCState:", cfg.MoCState);
  console.log("averageBlockTimeSeconds:", cfg.averageBlockTimeSeconds);

  const Factory = await ethers.getContractFactory("DocUsdPriceChainlinkCompat");
  const priceProvider = await Factory.deploy(cfg.MoCState, cfg.averageBlockTimeSeconds);
  const rcpt = await priceProvider.deploymentTransaction().wait();

  console.log("DOC/USD Chainlink-compatible oracle deployed at:", priceProvider.target);
  console.log("Gas used:", rcpt.gasUsed.toString());

  const latestRoundData = await priceProvider.latestRoundData();
  console.log("roundId:", latestRoundData[0].toString());
  console.log("answer:", latestRoundData[1].toString());
  console.log("startedAt:", latestRoundData[2].toString());
  console.log("updatedAt:", latestRoundData[3].toString());
  console.log("answeredInRound:", latestRoundData[4].toString());

  cfg.priceProviderAddress = priceProvider.target;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  console.log("Config updated with priceProviderAddress.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
