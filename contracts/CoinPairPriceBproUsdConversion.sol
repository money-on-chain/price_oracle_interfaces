// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import "./CoinPairPrice.sol";
import "./interfaces/IMocState.sol";
import "./interfaces/IPriceProvider.sol";
import "./interfaces/ICoinPairPrice.sol";

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
