// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IPriceProvider.sol";
import "./interfaces/IMocState.sol";
import "./interfaces/ICoinPairPrice.sol";

/// @title PriceProviderBproTecV1
/// @notice Exposes MoC's BPRO/RBTC price through the IPriceProvider interface.
/// @dev
/// - Uses MoCState as source of truth.
/// - Requires the BTC price provider inside MoCState to be valid (gate for freshness).
/// - Returns 18-decimal fixed-point value encoded in bytes32.
contract PriceProviderBproTecV1 is IPriceProvider {
  IMocState public mocState;

  constructor(IMocState _mocState) {
    require(address(_mocState) != address(0), "mocState address is zero");
    mocState = _mocState;
  }

  /// @notice Returns (price, valid) where price is BPRO/RBTC in 18 decimals.
  function peek() external view returns (bytes32, bool) {
    // Read BTC price provider once
    address provider = mocState.getBtcPriceProvider();
    if (provider == address(0)) return (bytes32(0), false);

    // Gate by provider validity (serves as freshness/age check)
    (bytes32 btcPrice, bool isValid) = ICoinPairPrice(provider).peek();
    if (!(isValid && btcPrice != bytes32(0))) return (bytes32(0), false);

    // Pull BPRO/RBTC PRICE (18 decimals)
    uint256 bproTecPrice = mocState.bproTecPrice();
    if (bproTecPrice == 0) return (bytes32(0), false);

    return (bytes32(bproTecPrice), true);
  }

  /// @notice Forwards the last publication block from MoC's BTC provider (used by age checks).
  function getLastPublicationBlock() external view returns (uint256) {
    address provider = mocState.getBtcPriceProvider();
    if (provider == address(0)) return 0;
    return ICoinPairPrice(provider).getLastPublicationBlock();
  }
}
