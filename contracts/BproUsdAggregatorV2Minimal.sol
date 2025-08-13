// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IMoCState {
  function bproUsdPrice() external view returns (uint256);
}

interface AggregatorV2Minimal {
  function latestAnswer() external view returns (int256);
}

contract BproUsdAggregatorV2Minimal is AggregatorV2Minimal {
  IMoCState public mocState;

  // Max uint that still fits into int256 (2^255 - 1)
  uint256 private constant INT256_MAX = (2**255 - 1);

  constructor(address _mocState) {
    require(_mocState != address(0), "mocState address is zero");
    mocState = IMoCState(_mocState);
  }

  function latestAnswer() external view returns (int256) {
    uint256 raw = mocState.bproUsdPrice();
    require(raw <= INT256_MAX, "overflow int256");
    return int256(raw);
  }
}
