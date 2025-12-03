// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/**
 * @notice Interface for MocState price providers relevant methods
 */
interface IMocState {

  // Relation between DOC and dollar
  function peg() external view returns (uint256);

  /**
   * @dev BPro USD PRICE
   * @return the BPro USD Price [using mocPrecision]
   */
  function bproUsdPrice() external view returns (uint256);

  /**
   * @dev BTC price of BPro
   * @return the BPro Tec Price [using reservePrecision]
   */
  function bproTecPrice() external view returns (uint256);

  /**
   * @dev Gets the BTCPriceProviderAddress
   * @return btcPriceProvider blocks there are in a day
   **/
  function getBtcPriceProvider() external view returns (address);

  /**
    @dev All docs in circulation
  */
  function docTotalSupply() external view returns(uint256);

  /**
   @dev return the value of the protected threshold configuration param
   @return protected threshold, currently 1.5
  */
  function getProtected() external view returns(uint256);

  function getInrateBag(bytes32 bucket) external view returns(uint256);

  function rbtcInSystem() external view returns (uint256);

  function getBucketNBTC(bytes32 bucket) external view returns(uint256);

  function getBucketNBPro(bytes32 bucket) external view returns(uint256);

  function getBucketNDoc(bytes32 bucket) external view returns(uint256);
}
