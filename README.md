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

### Test

```bash
# If you want to change setup see config/bprousd_aggregator_v2/deployConfig-rskTestnet.json
npx hardhat test test/bprousd_aggregator_v2/minimal.spec.js
```

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

### Test deployed contract

```bash
# If you want to change setup see config/bprousd_aggregator_v2/deployConfig-rskTestnet.json
npx hardhat run scripts/bprousd_aggregator_v2/read-latestAnswer.ts --network rskTestnet
```

## Notes

- V2 interface has no `decimals()`. Consumers must know the scale of `bproUsdPrice()` (often 18 decimals).
- The test uses an inline 0.8.24 mock to assert that `latestAnswer()` mirrors `bproUsdPrice()`.

