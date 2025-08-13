// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// Minimal mock implementing the read your adapter expects
contract MockMoCState {
  uint256 private _p;

  constructor(uint256 p) {
    _p = p;
  }

  function bproUsdPrice() external view returns (uint256) {
    return _p;
  }

  function set(uint256 p) external {
    _p = p;
  }
}
