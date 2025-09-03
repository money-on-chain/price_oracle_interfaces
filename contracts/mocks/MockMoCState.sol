// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IMocState.sol";

contract MockMoCState is IMocState {
    uint256 private _bproUsdPrice;
    address private _btcProvider;

    constructor(uint256 initialBproUsdPrice, address initialBtcProvider) {
        _bproUsdPrice = initialBproUsdPrice;
        _btcProvider = initialBtcProvider;
    }

    function setBproUsdPrice(uint256 newPrice) external {
        _bproUsdPrice = newPrice;
    }

    function setBtcPriceProvider(address newProvider) external {
        _btcProvider = newProvider;
    }

    function bproUsdPrice() external view returns (uint256) {
        return _bproUsdPrice;
    }

    function bproTecPrice() external pure returns (uint256) {
        return 0;
    }

    function getBtcPriceProvider() external view returns (address) {
        return _btcProvider;
    }
}
