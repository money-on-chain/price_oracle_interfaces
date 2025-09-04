import fs from "fs";
import hre from "hardhat";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

// ----- Hardhat v3 helpers -----
function selectedNetworkName(hre_) {
  return hre_.globalOptions?.network ?? process.env.HARDHAT_NETWORK ?? "hardhat";
}
function defaultConfigPath(root, networkName) {
  return path.join(root, "config", "bprorbtc", `deployConfig-${networkName}.json`);
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
  // Hardhat v3: obtain ethers from the connection
  const { ethers } = await hre.network.connect();

  const net = selectedNetworkName(hre);
  const cfgPath = resolveConfigPath(hre, repoRoot);
  const cfg = loadConfigOrDie(cfgPath);

  const toRay = (x) => ethers.parseUnits(String(x), 18);
  const pretty = (v) => ethers.formatUnits(v, 18);

  const [signer] = await ethers.getSigners();
  const from = await signer.getAddress();

  console.log("Selected network:", net);
  console.log("Config file:", cfgPath);
  console.log("Deployer:", from);
  console.log("Balance (wei):", (await ethers.provider.getBalance(from)).toString());

  // Basic sanity checks
  assertAddress("MoCState", cfg.MoCState);
  console.log("MoCState:", cfg.MoCState);

  // Deploy
  const Factory = await ethers.getContractFactory("PriceProviderBproTecV1");
  const priceProvider = await Factory.deploy(cfg.MoCState);
  const rcpt = await priceProvider.deploymentTransaction().wait();

  console.log("Price Provider Bpro Tec V1 deployed at:", priceProvider.target);
  console.log("Gas used:", rcpt.gasUsed.toString());

  // Quick read-back (human-friendly getters)
  const peek = await priceProvider.peek();

  console.log("Price: ", peek[0]);
  console.log("valid: ", peek[1]);

  // Persist address
  cfg.priceProviderAddress = priceProvider.target;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  console.log("Config updated with priceProviderAddress.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
