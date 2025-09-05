// scripts/fees_and_bitprorate/verify.js (ESM)
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import fs from "fs";
import hre from "hardhat";
import path from "path";
import { fileURLToPath } from "url";


// ---------------------------------------------------------------------------
// Paths / helpers
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function selectedNetworkName(hre_) {
  // Prefer CLI --network, then HARDHAT_NETWORK, else default "hardhat"
  return hre_.globalOptions?.network ?? process.env.HARDHAT_NETWORK ?? "hardhat";
}

function loadConfig(networkName) {
  // 1) DEPLOY_CONFIG_PATH overrides
  // 2) <repoRoot>/config/fees_and_bitprorate/deployConfig-<network>.json
  const cfgPath =
    process.env.DEPLOY_CONFIG_PATH ??
    path.join(__dirname, `../../config/usdbtc/deployConfig-${networkName}.json`);
  if (!fs.existsSync(cfgPath)) throw new Error(`Config not found: ${cfgPath}`);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  return { cfgPath, cfg };
}

function requireKeys(obj, keys, prefix = "") {
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null) {
      throw new Error(`Missing required key ${prefix}${k} in config`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const net = selectedNetworkName(hre);
  const { cfgPath, cfg } = loadConfig(net);

  // Minimal config validation
  requireKeys(cfg, ["MoCState", "priceProviderAddress"]);

  // Address to verify (env wins)
  const address = process.env.VERIFY_ADDRESS || cfg.priceProviderAddress;
  if (!address) throw new Error("Missing address: set VERIFY_ADDRESS or cfg.priceProviderAddress");

  // Build constructor args EXACTLY like deploy.js  

  const constructorArgs = [    
    cfg.MoCState,    
  ];

  // Choose verification provider; "blockscout" is appropriate for Rootstock
  const provider = process.env.VERIFY_PROVIDER || "blockscout";

  console.log("=== Verify PriceProviderUsdPerBtc ===");
  console.log("Network         :", net);
  console.log("Config          :", cfgPath);
  console.log("Address         :", address);
  console.log("Provider        :", provider);
  console.log("Constructor args:");  
  console.log("  MoCState     :", constructorArgs[0]);  

  await verifyContract(
    {
      address,
      constructorArgs,
      provider, // "blockscout" for Rootstock explorers
    },
    hre,
  );

  console.log("✔ Verification request submitted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
