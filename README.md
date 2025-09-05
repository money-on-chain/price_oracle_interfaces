# Price Providers Interfaces

Calculated or oracles interfaces

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

| Interface | Testnet Address                            | Mainnet Address | Description |
| --------- | ------------------------------------------ | --------------- | ----------- |
| BPRO/USD  | 0xde534F6600e582Aa41A0a30f32c51Ab5fe0F8019 |                 |             |
| USD/ARS   | 0xCf330C2FE1e8b4980Fb19A310a32E2B119e4c1B1 |                 |             |
| USD/COP   | 0x81852EEEA69A20D12A47A257EA4756847527E9E5 |                 |             |
| BPRO/ARS  | 0x3EdB871332380468ea7c76A9d1E98EdF7d8ef70B |                 |             |
| BPRO/COP  | 0x790A1b5882b6D8d63fd1fC6a18325B227E166035 |                 |             |
| FLIP/USD  | 0x780c13c6E3A124C35F2d8bDDf6B54A505A12A358 |                 |             |
| FLIP/BPRO | 0x56b8C52AE9D2BEfcfE84Dea8BDCb96991400102B |                 |             |
| BPRO/BTC  | 0xB5f25aCD095e930863799B60a16ed83075BBeB27 |                 |             |
| USD/BTC   | 0xf57bbB359579e6885aa654a8030688b6db5690dC |                 |             |

## BPRO/USD Aggregator (Chainlink V2-only)

This price provider return BPRO/USD from the money on chain contract (MoCState). The interface is compatible with chainlink V2. And return precision 1e8 (8 decimals)

### Test

```bash
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

### Notes

- return 8 decimals

## Price Provider BPRO/ARS (V1)

`CoinPairPriceBproUsdConversion` is an adapter contract that returns the price of **BPRO denominated in ARS (Argentinian Pesos)**.

---

## How it works

The contract combines two sources of information:

1. **`coinpairprice` (ICoinPairPrice)**  
   An external oracle that provides the **ARS/USD** exchange rate.  
   Example: if 1 USD = 1,366 ARS, the oracle returns `1366 * 1e18`.

2. **`mocState` (IMocState)**  
   The MoC protocol’s state contract, which provides the **BPRO/USD** price.  
   Example: if 1 BPRO = 137,880 USD, `mocState.bproUsdPrice()` returns `137880 * 1e18`.

---

## Formula

```
BPRO/ARS = (BPRO/USD) * (ARS/USD)
```

The calculation uses `Math.mulDiv` to handle multiplication and division safely with full precision, and the result is normalized to **18 decimals**.

---

## Example

- ARS/USD oracle: `1366 * 1e18`
- BPRO/USD from MoCState: `137880 * 1e18`

```
BPRO/ARS = (137880e18 * 1366e18) / 1e18
         = 188,459,680e18
```

**Interpretation:** 1 BPRO ≈ 188,459,680 ARS (≈ 188 million ARS).

### Test

```bash
# If you want to change setup see config/bproars/deployConfig-rskTestnet.json
npx hardhat test test/bproars/minimal.spec.js
```

### Deploy

```bash
# If you want to change setup see config/bproars/deployConfig-rskTestnet.json
npx hardhat run scripts/bproars/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/bproars/deployConfig-rskTestnet.json
npx hardhat run scripts/bproars/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/bproars/deployConfig-rskTestnet.json
npx hardhat run scripts/bproars/read-peek.ts --network rskTestnet
```

### Unit test

```bash
npx hardhat test test/CoinPairPriceBproUsdConversion.spec.js
```

## Price Provider BPRO/COP (V1)

`CoinPairPriceBproUsdConversion` is an adapter contract that returns the price of **BPRO denominated in COP (Colombian Pesos)**.

---

## How it works

The contract combines two sources of information:

1. **`coinpairprice` (ICoinPairPrice)**  
   An external oracle that provides the **COP/USD** exchange rate.  
   Example: if 1 USD = 3,987 COP, the oracle returns `3987 * 1e18`.

2. **`mocState` (IMocState)**  
   The MoC protocol’s state contract, which provides the **BPRO/USD** price.  
   Example: if 1 BPRO = 137,880 USD, `mocState.bproUsdPrice()` returns `137880 * 1e18`.

---

## Formula

```
BPRO/COP = (BPRO/USD) * (COP/USD)
```

The calculation uses `Math.mulDiv` to handle multiplication and division safely with full precision, and the result is normalized to **18 decimals**.

---

## Example

- COP/USD oracle: `3987 * 1e18`
- BPRO/USD from MoCState: `137880 * 1e18`

```
BPRO/COP = (137880e18 * 3987e18) / 1e18
         =
```

**Interpretation:** 1 BPRO ≈ COP (≈ million COP).

### Deploy

```bash
# If you want to change setup see config/bprocop/deployConfig-rskTestnet.json
npx hardhat run scripts/bprocop/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/bprocop/deployConfig-rskTestnet.json
npx hardhat run scripts/bprocop/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/bprocop/deployConfig-rskTestnet.json
npx hardhat run scripts/bprocop/read-peek.ts --network rskTestnet
```

### Unit test

```bash
npx hardhat test test/CoinPairPriceBproUsdConversion.spec.js
```

## Price Provider Dummy

return dummy price

### Deploy

```bash
# If you want to change setup see config/dummy/deployConfig-rskTestnet.json
npx hardhat run scripts/dummy/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/dummy/deployConfig-rskTestnet.json
npx hardhat run scripts/dummy/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/dummy/deployConfig-rskTestnet.json
npx hardhat run scripts/dummy/read-peek.ts --network rskTestnet
```

## Price Provider BPRO/USD (V1)

return BPRO/USD (V1)

### Deploy

```bash
# If you want to change setup see config/bprousdv1/deployConfig-rskTestnet.json
npx hardhat run scripts/bprousdv1/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/bprousdv1/deployConfig-rskTestnet.json
npx hardhat run scripts/bprousdv1/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/bprousdv1/deployConfig-rskTestnet.json
npx hardhat run scripts/bprousdv1/read-peek.ts --network rskTestnet
```

## Price Provider FLIP/USD (Mock)

return FLIP/USD (Mock)

### Deploy

```bash
# If you want to change setup see config/flipusd_mock/deployConfig-rskTestnet.json
npx hardhat run scripts/flipusd_mock/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/flipusd_mock/deployConfig-rskTestnet.json
npx hardhat run scripts/flipusd_mock/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/flipusd_mock/deployConfig-rskTestnet.json
npx hardhat run scripts/flipusd_mock/read-peek.ts --network rskTestnet
```

## Price Provider FLIP/BPRO

return FLIP/BPRO

### Deploy

```bash
# If you want to change setup see config/flipbpro/deployConfig-rskTestnet.json
npx hardhat run scripts/flipbpro/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/flipbpro/deployConfig-rskTestnet.json
npx hardhat run scripts/flipbpro/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/flipbpro/deployConfig-rskTestnet.json
npx hardhat run scripts/flipbpro/read-peek.ts --network rskTestnet
```

## Price Provider BPRO/BTC (V1)

return BPRO/BTC (V1)

### Deploy

```bash
# If you want to change setup see config/bprobtc/deployConfig-rskTestnet.json
npx hardhat run scripts/bprobtc/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/bprobtc/deployConfig-rskTestnet.json
npx hardhat run scripts/bprobtc/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/bprobtc/deployConfig-rskTestnet.json
npx hardhat run scripts/bprobtc/read-peek.ts --network rskTestnet
```

## Price Provider USD/BTC (V1)

return USD/BTC (V1)

### Deploy

```bash
# If you want to change setup see config/usdbtc/deployConfig-rskTestnet.json
npx hardhat run scripts/usdbtc/deploy.js --network rskTestnet
```

### Verify

```bash
# If you want to change setup see config/usdbtc/deployConfig-rskTestnet.json
npx hardhat run scripts/usdbtc/verify.js --network rskTestnet
```

### Test deployed contract

```bash
# If you want to change setup see config/usdbtc/deployConfig-rskTestnet.json
npx hardhat run scripts/usdbtc/read-peek.ts --network rskTestnet
```
