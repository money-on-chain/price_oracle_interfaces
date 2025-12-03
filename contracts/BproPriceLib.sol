// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IMocState.sol";

/**
 * @title BproPriceLib
 * @notice Helper functions to calculate BPRO/USD prices with a maybe outdated BTC/USD price
 *
 * @dev
 * This library implement the mocState bproUsdPrice and bproTecPrice methods.
 * We can't use those directly because they rely on getBitcoinPrice internally.
 * getBitcoinPrice reverts when the price is invalid.
 * This peek method should not revert, and instead use the old price but mark it as invalid.
 * Invalid prices are still useful for ballpark suggestions such as initializing the EMA on a deployment.
 */

library BproPriceLib {
    uint256 internal constant MOC_PRECISION = 1e18;
    uint256 internal constant RESERVE_PRECISION = 1e18;
    bytes32 internal constant BUCKET_C0 = "C0";
    bytes32 internal constant BUCKET_X2 = "X2";
    uint256 internal constant UINT256_MAX = type(uint256).max;

    function bproUsdPriceSafe(
        IMocState self,
        bytes32 btcPrice
    ) internal view returns (uint256) {
        return uint256(btcPrice) * bproTecPriceSafe(self, btcPrice) / MOC_PRECISION; // 18 decimals
    }

    function bproTecPriceSafe(
        IMocState self,
        bytes32 btcPrice
    ) internal view returns (uint256) {
        uint256 cov = globalCoverage(self, btcPrice);
        uint256 coverageThreshold = uint256(1) * MOC_PRECISION;

        // If Protected Mode is reached and below threshold
        if (cov <= self.getProtected() && cov < coverageThreshold) {
            return 1; // wei
        }

        return bproTecPriceHelper(self, BUCKET_C0, btcPrice);
    }

    function globalCoverage(
        IMocState self,
        bytes32 btcPrice
    ) internal view returns (uint256) {
        uint256 lB = lockedBitcoin(self, btcPrice, self.docTotalSupply());
        uint256 nB = collateralRbtcInSystem(self, btcPrice);

        if (lB == 0) {
            return UINT256_MAX;
        }

        return (nB * MOC_PRECISION) / lB;
    }

    function collateralRbtcInSystem(IMocState self, bytes32 btcPrice) public view returns(uint256) {
        uint256 rbtcInBtcx =  self.getBucketNBPro(BUCKET_X2) * bproTecPriceHelper(self, BUCKET_X2, btcPrice) / MOC_PRECISION;
        uint256 rbtcInBag = self.getInrateBag(BUCKET_C0);
        return self.rbtcInSystem() - rbtcInBtcx - rbtcInBag;
    }

    function bproTecPriceHelper(
        IMocState self,
        bytes32 bucket,
        bytes32 btcPrice
    ) internal view returns (uint256) {
        uint256 nB = self.getBucketNBTC(bucket);
        uint256 lb = lockedBitcoin(self, btcPrice, self.getBucketNDoc(bucket));
        uint256 nTp = self.getBucketNBPro(bucket);

        // Liquidation happens before this condition turns true
        if (nB < lb) {
            return 0;
        }

        if (nTp == 0) {
            return MOC_PRECISION;
        }

        // ([RES] - [RES]) * [MOC] / [MOC]
        return (nB - lb) * MOC_PRECISION / nTp;
    }

    function lockedBitcoin(
        IMocState self,
        bytes32 btcPrice,
        uint256 nDoc
    ) internal view returns (uint256) {
        return (nDoc * self.peg() * RESERVE_PRECISION) / uint256(btcPrice);
    }
}
