// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IPriceProvider.sol";
import "./interfaces/IMocState.sol";
import "./interfaces/ICoinPairPrice.sol";

/// @title PriceProviderUsdPerBtc
/// @notice Provides USD/BTC as the inverse of BTC/USD from MoC's BTC price provider.
/// @dev
/// - BTC/USD comes from mocState.getBtcPriceProvider() (ICoinPairPrice).
/// - Both input and output use 18-decimal fixed point.
/// - If the BTC provider reports invalid or zero, returns (0,false).
contract PriceProviderUsdPerBtc is IPriceProvider {
  IMocState public immutable mocState;

  constructor(IMocState _mocState) {
    require(address(_mocState) != address(0), "mocState is zero");
    mocState = _mocState;
  }

  /// @notice Returns USD/BTC with 18 decimals.
  function peek() external view override returns (bytes32, bool) {
    address provider = mocState.getBtcPriceProvider();
    if (provider == address(0)) return (bytes32(0), false);

    (bytes32 btcUsdRaw, bool ok) = ICoinPairPrice(provider).peek();
    if (!ok || btcUsdRaw == bytes32(0)) return (bytes32(0), false);

    uint256 btcUsd = uint256(btcUsdRaw); // BTC/USD in 18 decimals
    if (btcUsd == 0) return (bytes32(0), false);

    // USD/BTC = 1e18 / (BTC/USD)
    uint256 usdPerBtc = Math.mulDiv(1e18, 1e18, btcUsd);

    return (bytes32(usdPerBtc), usdPerBtc != 0);
  }

  /// @notice Forwards last publication block from MoC's BTC provider.
  function getLastPublicationBlock() external view override returns (uint256) {
    address provider = mocState.getBtcPriceProvider();
    if (provider == address(0)) return 0;
    return ICoinPairPrice(provider).getLastPublicationBlock();
  }
}
