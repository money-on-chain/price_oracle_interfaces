# BPRO/USD Aggregator (Chainlink V2-only)

Ready-to-run Hardhat + TypeScript project with two variants:
- **Minimal** (constructor): exposes `latestAnswer()` and reads directly from `IMoCState.bproUsdPrice()`.
- **Governed** (initializer): same read path but governed via Areopagus `Governed` (initializer + `onlyAuthorizedChanger` for source updates).

## Requirements
- Node.js 18+ or 20+
- An RPC provider (Infura/Alchemy/etc.)

## Quick start
```bash
nvm use
npm i
# choose testnet or mainnet
cp .env.testnet .env 
# edit .env with keys and addresses
npx hardhat compile
npx hardhat test
```

## Deploy (minimal constructor variant)
```bash
# Set MOC_STATE in .env or export it inline
npm run deploy:sepolia
```

## Deploy (governed initializer variant)
```bash
# Make sure GOVERNOR is set in .env
npm run deploy:sepolia:gov
```

## Notes
- Solidity **0.8.24** is pinned for both contracts.
- V2 interface has no `decimals()`. Consumers must know the scale of `bproUsdPrice()` (often 18 decimals).
- The test uses an inline 0.8.24 mock to assert that `latestAnswer()` mirrors `bproUsdPrice()`.
- For the governed variant, install your governance lib (e.g. `areopagus`) or ensure the import path resolves in your monorepo.

## Rootstock (Mainnet & Testnet)

1. Set in `.env`:
```
ROOTSTOCK_MAINNET_RPC_URL=https://public-node.rsk.co
ROOTSTOCK_TESTNET_RPC_URL=https://public-node.testnet.rsk.co
# optional explicit gas price in wei
ROOTSTOCK_GAS_PRICE=60000000
ROOTSTOCK_TESTNET_GAS_PRICE=60000000
```
2. Deploy:
```
npm run deploy:rootstock:testnet     # testnet (chainId 31)
npm run deploy:rootstock             # mainnet (chainId 30)
```
3. Verify (Blockscout/Etherscan plugin with customChains):
```
npm run verify:rootstock:testnet -- <contract-address> <ctor-args...>
npm run verify:rootstock -- <contract-address> <ctor-args...>
```

**Testnet**
```
npx hardhat verify --network rootstockTestnet   0xEb1ceb9E2d9544e5Fb9ea629816ff181398451E2   0x0adb40132cB0ffcEf6ED81c26A1881e214100555
```

**Notes**
- Rootstock is not EIP-1559. We set an explicit `gasPrice` in the network config to avoid underpriced txs.
- Explorers: https://explorer.rsk.co (mainnet), https://explorer.testnet.rsk.co (testnet).


3. Contracts

Testnet: 0xEb1ceb9E2d9544e5Fb9ea629816ff181398451E2
Mainnet: