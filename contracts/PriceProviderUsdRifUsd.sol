// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IPriceProvider.sol";

interface IUsdRifPriceInfo {
  function getPriceInfo()
    external
    view
    returns (uint256 price, bool valid, uint256 lastPublicationBlock);
}

interface IUsdRifBucket {
  function getCglb() external view returns (uint256);

  function calcCglb(uint256[] calldata prices) external view returns (uint256);

  function getTpAmount() external view returns (uint256);

  function pegContainer(uint256 index) external view returns (uint256 nTP, address priceProvider);
}

interface IUsdRifMultiCollateralGuard {
  function getBucketAmount() external view returns (uint256);

  function buckets(uint256 index) external view returns (address);

  function calcCombinedCglbWithPrices(
    uint256[][] calldata bucketsPACtps
  ) external view returns (uint256 combinedCglb);
}

/// @title PriceProviderUsdRifUsd
/// @notice Returns the USD value of one USDRIF, with 18 decimals.
/// @dev
/// The Rif-on-Chain buckets jointly back the same USDRIF supply. The guard's combined global
/// coverage is the normalized value of all bucket collateral divided by all pegged-token
/// liabilities. The reported USDRIF/USD price is therefore `min(1, combined coverage)`: it is
/// 1 USD while RoC has sufficient collateral coverage, and falls below 1 USD when aggregate
/// coverage is insufficient. It never reports a value above the one-dollar peg.
///
/// Most calls are expected to return 1 USD. That common path asks each bucket to confirm that
/// its own coverage is at least one and returns immediately. If any bucket is undercovered, or
/// cannot confirm coverage because a source is stale, the provider takes the more expensive path:
/// it retrieves every last-known price and calculates the exact combined coverage through the
/// multi-collateral guard. Stale prices remain usable for valuation but make `valid` false.
///
/// The bucket/provider topology is cached so regular reads do not rediscover it from the guard.
/// Anyone may refresh the cache after a protocol topology change. Such a change and this refresh
/// must be atomic: the guard requires the supplied price matrix to match its current topology.
///
/// The healthy path delegates pricing and validity checks to each bucket's getCglb().
/// The fallback reads direct oracles through their typed, unrestricted getPriceInfo().
/// The known DOC bucket uses its public IPriceProvider peek() and getLastPublicationBlock().
/// There is no ABI probing or duplicated DOC pricing math.
contract PriceProviderUsdRifUsd is IPriceProvider {
  uint256 internal constant ONE = 1e18;

  /// @notice Estimated age used only after every bucket confirms valid prices and coverage >= 1.
  /// @dev 20 is the deployed RIF and underlying BTC oracles' getValidPricePeriodInBlocks()
  /// setting. This is an explicit age estimate, not an observed publication block.
  /// It avoids additional oracle calls on the common path. Review this policy if
  /// oracle validity periods or the configured providers change.
  uint256 public constant HEALTHY_PRICE_AGE_BLOCKS = 20;

  IUsdRifMultiCollateralGuard public immutable multiCollateralGuard;
  address public immutable docBucket;

  uint256 public lastTopologyRefreshBlock;
  bytes32 public topologyHash;

  address[] public cachedBuckets;
  address[][] public cachedPriceProviders;

  event TopologyRefreshed(bytes32 indexed topologyHash, uint256 bucketAmount);

  constructor(IUsdRifMultiCollateralGuard _multiCollateralGuard, address _docBucket) {
    require(address(_multiCollateralGuard) != address(0), "guard address is zero");
    require(_docBucket != address(0), "DOC bucket address is zero");
    multiCollateralGuard = _multiCollateralGuard;
    docBucket = _docBucket;
    refreshTopology();
  }

  /// @notice Returns the USD value of one USDRIF, capped at 1e18 (one dollar).
  function peek() external view override returns (bytes32 price, bool valid) {
    // Price-only consumers need neither publication metadata nor an explicit price matrix.
    if (_isFullyCovered()) return (bytes32(ONE), true);
    (uint256 usdRifPrice, bool priceIsValid, ) = _fallbackPriceInfo();
    return (bytes32(usdRifPrice), priceIsValid);
  }

  /// @notice Returns the USD value of one USDRIF, validity, and its publication-block signal.
  function getPriceInfo()
    public
    view
    returns (uint256 price, bool valid, uint256 lastPublicationBlock)
  {
    if (_isFullyCovered()) {
      uint256 estimatedBlock = block.number > HEALTHY_PRICE_AGE_BLOCKS
        ? block.number - HEALTHY_PRICE_AGE_BLOCKS
        : 0;
      return (ONE, true, estimatedBlock);
    }
    return _fallbackPriceInfo();
  }

  /// @dev Each bucket fetches its own prices and rejects invalid sources. Successful
  /// coverage >= ONE for every bucket proves combined coverage >= ONE, without the
  /// guard's normalization or our explicit-price bookkeeping. Empty buckets return
  /// uint256.max and also pass. The cached topology must match the guard's topology.
  /// A shortfall or revert is inconclusive: another bucket may cover the shortfall,
  /// or a stale oracle may still have a usable last price. Both go to the fallback.
  function _isFullyCovered() private view returns (bool) {
    uint256 bucketAmount = cachedBuckets.length;
    for (uint256 j = 0; j < bucketAmount; j++) {
      try IUsdRifBucket(cachedBuckets[j]).getCglb() returns (uint256 coverage) {
        if (coverage < ONE) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  /// @dev Exceptional path: recover last prices, their actual age and aggregate validity,
  /// then calculate coverage explicitly. Re-reading prices here is intentional: minimizing
  /// the healthy path takes priority over the cost of this rarely needed calculation.
  function _fallbackPriceInfo()
    private
    view
    returns (uint256 price, bool valid, uint256 lastPublicationBlock)
  {
    uint256 bucketAmount = cachedBuckets.length;
    uint256[][] memory bucketsPACtps = new uint256[][](bucketAmount);
    valid = true;
    lastPublicationBlock = type(uint256).max;

    // Read every source before checking coverage: even when the answer is ONE,
    // validity and publication age must account for all collateral price inputs.
    for (uint256 j = 0; j < bucketAmount; j++) {
      uint256 tpAmount = cachedPriceProviders[j].length;
      bucketsPACtps[j] = new uint256[](tpAmount);

      for (uint256 i = 0; i < tpAmount; i++) {
        uint256 componentPrice;
        bool componentValid;
        uint256 componentPublicationBlock;

        if (cachedBuckets[j] == docBucket) {
          // The deployed DOC provider has no getPriceInfo(). Its public peek()
          // already derives DOC/USD and preserves the BTC oracle's validity flag.
          (componentPrice, componentValid, componentPublicationBlock) = _getDocUsdPriceInfo(
            cachedPriceProviders[j][i]
          );
        } else {
          // Published market oracles restrict peek() to whitelisted consumers;
          // getPriceInfo() exposes the last price, validity and age publicly.
          (componentPrice, componentValid, componentPublicationBlock) = IUsdRifPriceInfo(
            cachedPriceProviders[j][i]
          ).getPriceInfo();
        }

        bucketsPACtps[j][i] = componentPrice;
        // Staleness changes validity, not the supplied price: returning zero or
        // calling the guard's getCombinedCglb() would lose last-price semantics.
        valid = valid && componentValid && componentPrice != 0;
        if (componentPublicationBlock < lastPublicationBlock) {
          lastPublicationBlock = componentPublicationBlock;
        }
      }
    }

    // Combined coverage is a nonnegative weighted average of bucket coverages.
    // If every bucket is covered, the capped price must be ONE; normalization and
    // weighted aggregation in the guard cannot change that answer. Empty buckets
    // return uint256.max and are excluded by the guard, so also pass this check.
    bool allBucketsCovered = true;
    for (uint256 j = 0; j < bucketAmount; j++) {
      if (IUsdRifBucket(cachedBuckets[j]).calcCglb(bucketsPACtps[j]) < ONE) {
        allBucketsCovered = false;
        break;
      }
    }
    if (allBucketsCovered) return (ONE, valid, lastPublicationBlock);

    // One undercovered bucket does not prove a global shortfall: other buckets
    // may cover it. Let the guard calculate the exact combined coverage using
    // the same prices, including stale last-known values, without re-fetching them.
    uint256 combinedCoverage = multiCollateralGuard.calcCombinedCglbWithPrices(bucketsPACtps);
    price = combinedCoverage > ONE ? ONE : combinedCoverage;
  }

  /// @notice Returns the estimated healthy-path block or actual oldest fallback publication block.
  function getLastPublicationBlock() external view override returns (uint256) {
    (, , uint256 lastPublicationBlock) = getPriceInfo();
    return lastPublicationBlock;
  }

  /// @notice Refreshes the cached guard buckets and their price providers.
  /// @dev Permissionless so governance can include it in the same transaction batch that changes
  /// the guard topology. Each provider is validated through its known public ABI.
  function refreshTopology() public {
    uint256 bucketAmount = multiCollateralGuard.getBucketAmount();
    require(bucketAmount != 0, "guard has no buckets");

    delete cachedBuckets;
    delete cachedPriceProviders;

    bool docBucketFound;
    bytes32 newTopologyHash = keccak256(
      abi.encode(address(multiCollateralGuard), docBucket, bucketAmount)
    );

    for (uint256 j = 0; j < bucketAmount; j++) {
      address bucketAddress = multiCollateralGuard.buckets(j);
      require(bucketAddress != address(0), "bucket address is zero");

      IUsdRifBucket bucket = IUsdRifBucket(bucketAddress);
      uint256 tpAmount = bucket.getTpAmount();
      require(tpAmount != 0, "bucket has no pegged tokens");

      cachedBuckets.push(bucketAddress);
      cachedPriceProviders.push();
      newTopologyHash = keccak256(abi.encode(newTopologyHash, bucketAddress, tpAmount));

      for (uint256 i = 0; i < tpAmount; i++) {
        (, address priceProvider) = bucket.pegContainer(i);
        require(priceProvider != address(0), "price provider address is zero");
        cachedPriceProviders[j].push(priceProvider);
        newTopologyHash = keccak256(abi.encode(newTopologyHash, priceProvider));
      }

      if (bucketAddress == docBucket) {
        require(!docBucketFound, "DOC bucket is duplicated");
        require(tpAmount == 1, "DOC bucket must have one pegged token");
        docBucketFound = true;

        IPriceProvider docPriceProvider = IPriceProvider(cachedPriceProviders[j][0]);
        docPriceProvider.peek();
        docPriceProvider.getLastPublicationBlock();
      } else {
        for (uint256 i = 0; i < tpAmount; i++) {
          IUsdRifPriceInfo(cachedPriceProviders[j][i]).getPriceInfo();
        }
      }
    }

    require(docBucketFound, "DOC bucket not found");
    topologyHash = newTopologyHash;
    lastTopologyRefreshBlock = block.number;
    emit TopologyRefreshed(newTopologyHash, bucketAmount);
  }

  function getCachedBucketAmount() external view returns (uint256) {
    return cachedBuckets.length;
  }

  function getCachedTpAmount(uint256 bucketIndex) external view returns (uint256) {
    return cachedPriceProviders[bucketIndex].length;
  }

  function _getDocUsdPriceInfo(
    address docPriceProviderAddress
  ) private view returns (uint256 price, bool valid, uint256 lastPublicationBlock) {
    IPriceProvider docPriceProvider = IPriceProvider(docPriceProviderAddress);
    bytes32 priceBytes;
    (priceBytes, valid) = docPriceProvider.peek();
    price = uint256(priceBytes);
    lastPublicationBlock = docPriceProvider.getLastPublicationBlock();
  }
}
