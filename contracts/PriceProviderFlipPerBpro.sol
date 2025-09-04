// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IPriceProvider.sol";
import "./interfaces/IMocState.sol";
import "./interfaces/ICoinPairPrice.sol";

/// @title PriceProviderFlipPerBpro
/// @notice Exposes FLIP/BPRO price using two USD-denominated sources:
///         FLIP/BPRO = (FLIP/USD) / (BPRO/USD)
/// @dev
/// - FLIP/USD comes from an external IPriceProvider (assumed 18 decimals).
/// - BPRO/USD comes from MoCState (bproUsdPrice(), 18 decimals).
/// - As in CoinPairPriceBproUsdConversion, we gate output by checking that
///   MoC's BTC price provider (getBtcPriceProvider) reports a valid price.
/// - Result is 18-decimal fixed point.
/// - getLastPublicationBlock(): min(lastPub of FLIP/USD, lastPub of MoC's BTC provider).
contract PriceProviderFlipPerBpro is IPriceProvider {
  IPriceProvider public immutable flipUsd; // expects 18d
  IMocState public immutable mocState;

  constructor(IPriceProvider _flipUsd, IMocState _mocState) {
    require(address(_flipUsd) != address(0), "flipUsd is zero");
    require(address(_mocState) != address(0), "mocState is zero");
    flipUsd = _flipUsd;
    mocState = _mocState;
  }

  /// @notice Returns FLIP/BPRO with 18 decimals, gated by MoC BTC provider validity.
  function peek() external view override returns (bytes32, bool) {
    // 1) Gate by MoC BTC provider validity (same pattern you use now)
    address btcProvider = mocState.getBtcPriceProvider();
    if (btcProvider == address(0)) return (bytes32(0), false);

    (bytes32 btcPrice, bool btcOk) = ICoinPairPrice(btcProvider).peek();
    if (!(btcOk && btcPrice != bytes32(0))) return (bytes32(0), false);

    // 2) Read FLIP/USD (18d) from external provider
    (bytes32 fRaw, bool fOk) = flipUsd.peek();
    if (!fOk || fRaw == bytes32(0)) return (bytes32(0), false);
    uint256 f = uint256(fRaw);

    // 3) Read BPRO/USD (18d) from MoC
    uint256 b = mocState.bproUsdPrice();
    if (b == 0) return (bytes32(0), false);

    // 4) Compute: FLIP/BPRO = (FLIP/USD) / (BPRO/USD) = (f * 1e18) / b
    uint256 flipPerBpro = Math.mulDiv(f, 1e18, b);
    if (flipPerBpro == 0) return (bytes32(0), false);

    return (bytes32(flipPerBpro), true);
  }

  /// @notice Freshness: min(lastPubBlock of FLIP/USD, lastPubBlock of MoC's BTC provider).
  function getLastPublicationBlock() external view override returns (uint256) {
    address btcProvider = mocState.getBtcPriceProvider();
    uint256 a = flipUsd.getLastPublicationBlock();
    uint256 b = btcProvider == address(0)
      ? type(uint256).max
      : ICoinPairPrice(btcProvider).getLastPublicationBlock();
    return a < b ? a : b;
  }
}
