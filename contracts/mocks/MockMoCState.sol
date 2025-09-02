// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockMoCState {
    uint256 private _price;

    constructor(uint256 initialPrice) {
        _price = initialPrice;
    }

    function bproUsdPrice() external view returns (uint256) {
        return _price;
    }

    function setPrice(uint256 newPrice) external {
        _price = newPrice;
    }
}
