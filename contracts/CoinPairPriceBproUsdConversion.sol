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

  constructor(
    ICoinPairPrice _coinpairprice,
    IMocState _mocState
  )
    CoinPairPrice(_coinpairprice)
  {
    require(address(_mocState) != address(0), "mocState address is zero");
    mocState = _mocState;
  }

  /// NOTE: Assumes coinpairpricePrice has 18 decimals. If not, scale here.
  function peek() external view override returns (bytes32, bool) {
    (bytes32 coinpairpricePrice, bool coinpairpriceIsValid) = coinpairprice.peek();

    if (coinpairpriceIsValid && coinpairpricePrice != bytes32(0)) {
      (bytes32 btcPrice, bool isValid) = IPriceProvider(mocState.getBtcPriceProvider()).peek();
      if (isValid && btcPrice != bytes32(0)) {
        uint256 bproUsdPrice = mocState.bproUsdPrice(); // 18d
        uint256 calculatedPrice = Math.mulDiv(
          bproUsdPrice,
          uint256(coinpairpricePrice),
          RATE_PRECISION
        );
        return (bytes32(calculatedPrice), calculatedPrice != 0);
      }
    }
    return (0, false);
  }
}
