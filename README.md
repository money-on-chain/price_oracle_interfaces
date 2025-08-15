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
npm run deploy:rootstock:testnet
```

## Deploy (governed initializer variant)
```bash
# Make sure GOVERNOR is set in .env
npm run deploy:rootstock:testnet:gov
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
npx hardhat verify --network rootstockTestnet   0x6A40d19DA7d5DAc4b6102d622fbbb69367892658   0x0adb40132cB0ffcEf6ED81c26A1881e214100555
```

Result:

```
Successfully submitted source code for contract
contracts/BproUsdAggregatorV2Minimal.sol:BproUsdAggregatorV2Minimal at 0x6A40d19DA7d5DAc4b6102d622fbbb69367892658
for verification on the block explorer. Waiting for verification result...

Successfully verified contract BproUsdAggregatorV2Minimal on the block explorer.
https://rootstock-testnet.blockscout.com/address/0x6A40d19DA7d5DAc4b6102d622fbbb69367892658#code
```



**Mainnet**
```
npx hardhat verify --network rootstock 0xC4F0392ae65EBcC5Bdbe6fEDE84E81586096e741 0xb9C42EFc8ec54490a37cA91c423F7285Fa01e257
```

Result:

```
Successfully submitted source code for contract
contracts/BproUsdAggregatorV2Minimal.sol:BproUsdAggregatorV2Minimal at 0xC4F0392ae65EBcC5Bdbe6fEDE84E81586096e741
for verification on the block explorer. Waiting for verification result...

Successfully verified contract BproUsdAggregatorV2Minimal on the block explorer.
https://rootstock.blockscout.com/address/0xC4F0392ae65EBcC5Bdbe6fEDE84E81586096e741#code
```



**Notes**
- Rootstock is not EIP-1559. We set an explicit `gasPrice` in the network config to avoid underpriced txs.
- Explorers: https://explorer.rsk.co (mainnet), https://explorer.testnet.rsk.co (testnet).


3. Contracts

Testnet - BproUsdAggregatorV2Minimal: 0xEb1ceb9E2d9544e5Fb9ea629816ff181398451E2
Mainnet: