# Price Oracles Interfaces

Interfaces to decentralized price oracle.

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



## BPRO/ARS Price Provider

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




## BPRO/COP Price Provider

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

**Interpretation:** 1 BPRO ≈  COP (≈  million COP).


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





## Price Provider Bpro USD V1

return  Bpro USD V1


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



## Price Provider Flip/USD Mock

return  FLIP/USD Mock


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




## Price Provider Flip/BPRO

return  FLIP/BPRO


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



