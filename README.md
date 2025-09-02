# Price Oracles Interfaces

Interfaces to decentralized price oracle.

## Requirements

- Node.js 20.10.x +

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

## BPRO/USD Aggregator (Chainlink V2-only)

Ready-to-run Hardhat + TypeScript project:

- **Minimal** (constructor): exposes `latestAnswer()` and reads directly from `IMoCState.bproUsdPrice()`.

### Deploy

```bash
# If you want to change setup see config/bprousd_aggregator_v2/deployConfig-rskTestnet.json
npx hardhat run scripts/bprousd_aggregator_v2/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/bprousd_aggregator_v2/deployConfig-rskTestnet.json
npx hardhat run scripts/bprousd_aggregator_v2/verify.js --network rskTestnet
```

## Notes

- V2 interface has no `decimals()`. Consumers must know the scale of `bproUsdPrice()` (often 18 decimals).
- The test uses an inline 0.8.24 mock to assert that `latestAnswer()` mirrors `bproUsdPrice()`.


3. Verify (Blockscout/Etherscan plugin with customChains):

```
npm run verify:rootstock:testnet -- <contract-address> <ctor-args...>
npm run verify:rootstock -- <contract-address> <ctor-args...>
```

**Testnet**

```
npx hardhat verify --network rootstockTestnet 0xFfbEe1089b1ad5f31c92aFf9918e668e1a15C22A 0x0adb40132cB0ffcEf6ED81c26A1881e214100555
```

Result:

```
Successfully submitted source code for contract
contracts/BproUsdAggregatorV2Minimal.sol:BproUsdAggregatorV2Minimal at 0xFfbEe1089b1ad5f31c92aFf9918e668e1a15C22A
for verification on the block explorer. Waiting for verification result...

Successfully verified contract BproUsdAggregatorV2Minimal on the block explorer.
https://rootstock-testnet.blockscout.com/address/0xFfbEe1089b1ad5f31c92aFf9918e668e1a15C22A#code
```
