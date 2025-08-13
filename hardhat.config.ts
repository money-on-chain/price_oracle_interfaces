import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [      
      { version: "0.8.24" }
    ],
    overrides: {
      "contracts/BproUsdAggregatorV2Minimal.sol": { version: "0.8.24" },
      "contracts/BproUsdAggregatorV2Governed.sol": { version: "0.8.24" }
    }
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts
    },
    // Rootstock Mainnet (chainId 30)
    rootstock: {
      chainId: 30,
      url: process.env.ROOTSTOCK_MAINNET_RPC_URL || "https://public-node.rsk.co",
      accounts,
      // Rootstock is not EIP-1559. Set an explicit gasPrice (in wei) if needed.
      // Typical minimum is ~0.06 gwei = 60,000,000 wei; adjust as your provider suggests.
      gasPrice: process.env.ROOTSTOCK_GAS_PRICE ? Number(process.env.ROOTSTOCK_GAS_PRICE) : 60000000
    },
    // Rootstock Testnet (chainId 31)
    rootstockTestnet: {
      chainId: 31,
      url: process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co",
      accounts,
      gasPrice: process.env.ROOTSTOCK_TESTNET_GAS_PRICE ? Number(process.env.ROOTSTOCK_TESTNET_GAS_PRICE) : 60000000
    }
  },
  etherscan: {
    // Para Blockscout NO hace falta una key real; usa cualquier string no vacío.
    apiKey: {
      rootstockTestnet: "blockscout",
      rootstock: "blockscout",
    },
    customChains: [
      {
        network: "rootstockTestnet",
        chainId: 31,
        urls: {
          apiURL: "https://rootstock-testnet.blockscout.com/api",
          browserURL: "https://rootstock-testnet.blockscout.com",
        },
      },
      {
        network: "rootstock",
        chainId: 30,
        urls: {
          apiURL: "https://rootstock.blockscout.com/api",
          browserURL: "https://rootstock.blockscout.com",
        },
      },
    ],
  },  
  sourcify: { enabled: false },
};

export default config;
