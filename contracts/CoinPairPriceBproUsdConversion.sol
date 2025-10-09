// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import "./CoinPairPrice.sol";
import "./interfaces/IMocState.sol";
import "./interfaces/IPriceProvider.sol";
import "./interfaces/ICoinPairPrice.sol";

/**
 * @title CoinPairPriceBproUsdConversion
 * @notice Adapter contract that returns the price of BPRO denominated in ARS (Argentinian Pesos).
 *
 * @dev
 * This contract combines two different data sources:
 *  - An external fiat oracle (`coinpairprice`) that provides the ARS/USD exchange rate.
 *  - The MoCState contract (`mocState`) that provides the BPRO/USD price.
 *
 * By multiplying BPRO/USD with ARS/USD, the resulting price is BPRO/ARS,
 * normalized to 18 decimals using Math.mulDiv to avoid precision loss or overflow.
 *
 * Formula:
 *    BPRO/ARS = (BPRO/USD) * (ARS/USD)
 *
 * Example:
 *  - If ARS/USD = 1,366 (1 USD = 1,366 ARS)
 *  - and BPRO/USD = 137,880 (1 BPRO = 137,880 USD),
 *  - then BPRO/ARS = 188,459,680 (1 BPRO ≈ 188 million ARS).
 */

contract CoinPairPriceBproUsdConversion is CoinPairPrice {
  IMocState public mocState;
  uint256 public constant RATE_PRECISION = 1e18;

  constructor(ICoinPairPrice _coinpairprice, IMocState _mocState) CoinPairPrice(_coinpairprice) {
    require(address(_mocState) != address(0), "mocState address is zero");
    mocState = _mocState;
  }

  /// NOTE: Assumes coinpairpricePrice has 18 decimals. If not, scale here.
  function peek() external view override returns (bytes32, bool) {
    // 1) Read both data sources (even if they report invalid)
    (bytes32 pairRateBytes, bool pairRateIsValid) = coinpairprice.peek();
    (, bool btcIsValid) = IPriceProvider(mocState.getBtcPriceProvider()).peek();

    // 2) Convert the external pair rate and get BPRO/USD price from MoCState
    uint256 pairRate = uint256(pairRateBytes); // assumed to have 18 decimals
    uint256 bproUsdPrice = mocState.bproUsdPrice(); // 18 decimals

    // 3) Try to calculate the conversion regardless of validity flags
    uint256 calculatedPrice = 0;
    if (pairRate != 0 && bproUsdPrice != 0) {
      calculatedPrice = Math.mulDiv(bproUsdPrice, pairRate, RATE_PRECISION);
    }

    // 4) Valid if both sources are valid and the result is non-zero
    bool overallValid = pairRateIsValid && btcIsValid && calculatedPrice != 0;

    // 5) Always return the calculated price (even if invalid)
    return (bytes32(calculatedPrice), overallValid);
  }
}
