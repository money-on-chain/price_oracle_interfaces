import fs from "fs";
import hre from "hardhat";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

// Helpers (identical to deploy.ts)
function selectedNetworkName(hre_: typeof hre) {
  return hre_.globalOptions?.network ?? process.env.HARDHAT_NETWORK ?? "hardhat";
}
function defaultConfigPath(root: string, networkName: string) {
  return path.join(root, "config", "bproars", `deployConfig-${networkName}.json`);
}
function resolveConfigPath(hre_: typeof hre, root: string) {
  const fromEnv = process.env.DEPLOY_CONFIG_PATH;
  return fromEnv
    ? path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(fromEnv)
    : defaultConfigPath(root, selectedNetworkName(hre_));
}
function loadConfigOrDie(cfgPath: string) {
  if (!fs.existsSync(cfgPath)) throw new Error(`Config not found: ${cfgPath}`);
  return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ethers } = (await hre.network.connect()) as any;
  const net = selectedNetworkName(hre);
  const cfgPath = resolveConfigPath(hre, repoRoot);
  const cfg = loadConfigOrDie(cfgPath);

  if (!cfg.priceProviderAddress) {
    throw new Error(`No priceProviderAddress found in config: ${cfgPath}`);
  }

  console.log("Selected network:", net);
  console.log("Config file:", cfgPath);
  console.log("Price provider address:", cfg.priceProviderAddress);

  // Attach contract
  const priceProvider = await ethers.getContractAt(
    "CoinPairPriceBproUsdConversion",
    cfg.priceProviderAddress,
  );

  const peek = await priceProvider.peek();

  // Raw bytes32
  console.log("Price (raw bytes32, 18 decimals):", peek[0].toString());

  // human-friendly (divide by 1e18)
  const asBigInt = BigInt(peek[0].toString());
  const formatted = Number(asBigInt) / 1e18;
  console.log("Price (formatted):", formatted.toFixed(8), "USD");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
