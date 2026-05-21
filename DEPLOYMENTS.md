# Price Providers Interfaces

Calculated oracles interfaces

## Table of Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Deployed interfaces](#deployed-interfaces)
- [BPRO/USD Aggregator (Chainlink V2-only)](#bprousd-aggregator-chainlink-v2-only)
- [Price Provider BPRO/ARS (V1)](#price-provider-bproars-v1)
- [Price Provider BPRO/COP (V1)](#price-provider-bprocop-v1)
- [Price Provider Dummy](#price-provider-dummy)
- [Price Provider BPRO/USD (V1)](#price-provider-bprousd-v1)
- [Price Provider FLIP/USD (Mock)](#price-provider-flipusd-mock)
- [Price Provider FLIP/BPRO](#price-provider-flipbpro)
- [Price Provider BPRO/BTC (V1)](#price-provider-bprobtc-v1)
- [Price Provider USD/BTC (V1)](#price-provider-usdbtc-v1)

## Requirements

- Node.js 22.10.x +

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

## Deployed interfaces

| Interface | Testnet Address                            | Mainnet Address | Description             |
| --------- | ------------------------------------------ | --------------- | ----------------------- |
| BPRO/USD  | 0xb45cEF263FFB8bbfA91c176C722692573c743ACe |                 | BPRO/USD price provider |
| DOC/USD   | 0xaeB119cF080FDD668E6Ba845f663912C473778F8 |                 | DOC/USD price provider  |
| USD/ARS   | 0xCf330C2FE1e8b4980Fb19A310a32E2B119e4c1B1 |                 | USD/ARS price provider  |
| USD/COP   | 0x81852EEEA69A20D12A47A257EA4756847527E9E5 |                 | USD/COP price provider  |
| BPRO/ARS  | 0x6979513C5De144B31dD36d87892fD6CEF95Cf59A |                 | BPRO/ARS adapter        |
| BPRO/COP  | 0xAC7262297a33106603EC19c50C0BBaF35f0701a2 |                 | BPRO/COP adapter        |
| FLIP/USD  | 0x780c13c6E3A124C35F2d8bDDf6B54A505A12A358 |                 | FLIP/USD mock           |
| FLIP/BPRO | 0x9425419A79f88f8cB3eC6690C8e2e231772DC4E9 |                 | FLIP/BPRO adapter       |
| BPRO/BTC  | 0x956393D0f568a8088915596Af1Cd067720E36A26 |                 | BPRO/BTC adapter        |
| USD/BTC   | 0x70f08c290B40B1A6C9b77b57099Aa1B114e83a01 |                 | USD/BTC adapter         |

## BPRO/USD Aggregator (Chainlink V2-only)

This price provider returns BPRO/USD from the Money on Chain contract (`MoCState`).  
The interface is compatible with Chainlink V2 and returns precision `1e8` (8 decimals).

- Returns 8 decimals precision.

### Test

```bash
npx hardhat test test/bprousd_aggregator_v2/minimal.spec.js
```

### Deploy

```bash
npx hardhat run scripts/bprousd_aggregator_v2/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/bprousd_aggregator_v2/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/bprousd_aggregator_v2/read-latestAnswer.ts --network rskTestnet
```

---

## Price Provider BPRO/ARS (V1)

`CoinPairPriceBproUsdConversion` is an adapter contract that returns the price of **BPRO denominated in ARS (Argentinian Pesos)**.

- Returns values with **18 decimals** precision.
- Combines `coinpairprice` (ARS/USD oracle) and `mocState` (BPRO/USD oracle).

### Formula

```
BPRO/ARS = (BPRO/USD) * (ARS/USD)
```

### Example

- ARS/USD oracle: `1366 * 1e18`
- BPRO/USD from MoCState: `137880 * 1e18`

```
BPRO/ARS = (137880e18 * 1366e18) / 1e18
         = 188,459,680e18
```

**Interpretation:** 1 BPRO ≈ 188,459,680 ARS (≈ 188 million ARS).

### Test

```bash
npx hardhat test test/bproars/minimal.spec.js
```

### Deploy

```bash
npx hardhat run scripts/bproars/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/bproars/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/bproars/read-peek.ts --network rskTestnet
```

### Unit test

```bash
npx hardhat test test/CoinPairPriceBproUsdConversion.spec.js
```

---

## Price Provider BPRO/COP (V1)

`CoinPairPriceBproUsdConversion` is an adapter contract that returns the price of **BPRO denominated in COP (Colombian Pesos)**.

- Returns values with **18 decimals** precision.
- Combines `coinpairprice` (COP/USD oracle) and `mocState` (BPRO/USD oracle).

### Formula

```
BPRO/COP = (BPRO/USD) * (COP/USD)
```

### Example

- COP/USD oracle: `3987 * 1e18`
- BPRO/USD from MoCState: `137880 * 1e18`

```
BPRO/COP = (137880e18 * 3987e18) / 1e18
         = 549,720,360e18
```

**Interpretation:** 1 BPRO ≈ 549,720,360 COP (≈ 550 million COP).

### Deploy

```bash
npx hardhat run scripts/bprocop/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/bprocop/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/bprocop/read-peek.ts --network rskTestnet
```

### Unit test

```bash
npx hardhat test test/CoinPairPriceBproUsdConversion.spec.js
```

---

## Price Provider Dummy

`PriceProviderDummy` is a minimal provider that always returns a fixed price set at deployment.

- Returns values with **18 decimals** precision.

### Deploy

```bash
npx hardhat run scripts/dummy/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/dummy/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/dummy/read-peek.ts --network rskTestnet
```

---

## Price Provider BPRO/USD (V1)

`PriceProviderBproUsdV1` returns the **BPRO/USD** price from MoCState.  
Uses the BTC provider of MoC as validity gate.

- Returns values with **18 decimals** precision.

### Deploy

```bash
npx hardhat run scripts/bprousdv1/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/bprousdv1/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/bprousdv1/read-peek.ts --network rskTestnet
```

---

## Price Provider FLIP/USD (Mock)

Mock provider that always returns FLIP/USD at a fixed value (commonly 1e18).

- Returns values with **18 decimals** precision.

### Deploy

```bash
npx hardhat run scripts/flipusd_mock/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/flipusd_mock/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/flipusd_mock/read-peek.ts --network rskTestnet
```

---

## Price Provider FLIP/BPRO

`PriceProviderFlipPerBpro` returns the ratio **FLIP/BPRO**, calculated as:

```
FLIP/BPRO = (FLIP/USD) / (BPRO/USD)
```

- Returns values with **18 decimals** precision.

### Deploy

```bash
npx hardhat run scripts/flipbpro/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/flipbpro/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/flipbpro/read-peek.ts --network rskTestnet
```

---

## Price Provider BPRO/BTC (V1)

`PriceProviderBproBtc` returns the **BPRO/BTC** price.  
Uses MoCState’s BTC provider as gate for validity.

- Returns values with **18 decimals** precision.

### Deploy

```bash
npx hardhat run scripts/bprobtc/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/bprobtc/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/bprobtc/read-peek.ts --network rskTestnet
```

---

## Price Provider USD/BTC (V1)

`PriceProviderUsdBtc` returns the **USD/BTC** price, i.e. the inverse of RBTC/USD from MoC’s BTC provider.

- Returns values with **18 decimals** precision.

### Deploy

```bash
npx hardhat run scripts/usdbtc/deploy.js --network rskTestnet
```

### Verify

```bash
npx hardhat run scripts/usdbtc/verify.js --network rskTestnet
```

### Test deployed contract

```bash
npx hardhat run scripts/usdbtc/read-peek.ts --network rskTestnet
```
