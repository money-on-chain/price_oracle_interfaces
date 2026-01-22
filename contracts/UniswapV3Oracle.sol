// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.8.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FixedPoint96.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "./interfaces/IERC20Metadata.sol";

contract UniswapV3Oracle {
  IUniswapV3Pool public immutable _uniswapV3Pool;
  uint32 public immutable _twapInterval;
  address public immutable _quoteToken;
  uint256 public immutable _quoteTokenIdx;
  uint256 public immutable _otherTokenIdx;
  uint256 public immutable _adjustedDecimals;

  /// @param pool The Uniswap v3 pool to get the price of the token
  /// @param twapInterval The time interval in seconds to get the twap over
  /// @param quoteToken The token to quote the price in terms of
  constructor(IUniswapV3Pool pool, uint32 twapInterval, address quoteToken) {
    require(
      pool.token0() == quoteToken || pool.token1() == quoteToken,
      "at least one token from the pool must be the quoted token"
    );
    require(twapInterval > 0, "twap interval must be > 0");
    
    // Use ternary to assign immutable variables (can't use if statements for immutables)
    _quoteTokenIdx = pool.token0() == quoteToken ? 0 : 1;
    _otherTokenIdx = pool.token0() == quoteToken ? 1 : 0;
    
    _uniswapV3Pool = pool;
    _twapInterval = twapInterval;
    _quoteToken = quoteToken;
    _adjustedDecimals = getAdjustedDecimals(pool, quoteToken);
  }

  function getPrice() public view virtual returns (uint256) {
    return getPriceFromPool(_uniswapV3Pool, _twapInterval);
  }

  /// legacy peek function
  function peek() external view virtual returns (bytes32, bool) {
    return (bytes32(getPrice()), getIsValid());
  }

  // From an oracle perspective, these prices are 'live'.
  function getLastPublicationBlock() external view returns (uint256) {
    return block.number;
  }

  // Live prices, are always vaild.
  function getIsValid() public view virtual returns (bool) {
    return true;
  }

  /// @notice Get the price of a token
  /// @param pool The Uniswap v3 pool to get the price of the token
  /// @param twapInterval The time interval in seconds to get the twap over
  function getPriceFromPool(
    IUniswapV3Pool pool,
    uint32 twapInterval
  ) internal view returns (uint256) {
    return
      getActualPrice(
        getPriceX96FromSqrtPriceX96(getSqrtTwapX96(pool, twapInterval)),
        _adjustedDecimals
      );
  }

  /// @notice Get the current twap price of a pool
  /// @param pool The Uniswap v3 pool to get the twap price of
  /// @param twapInterval The time interval in seconds to get the twap over
  /// @return sqrtPriceX96 The time weighted average price
  function getSqrtTwapX96(
    IUniswapV3Pool pool,
    uint32 twapInterval
  ) private view returns (uint160 sqrtPriceX96) {
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = twapInterval; // from (before)
    secondsAgos[1] = 0; // to (now)

    (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);
    // tick(imprecise as it's an integer) to price
    sqrtPriceX96 = TickMath.getSqrtRatioAtTick(
      int24((tickCumulatives[_quoteTokenIdx] - tickCumulatives[_otherTokenIdx]) / twapInterval)
    );
  }

  /// @notice Convert sqrtPriceX96 to priceX96
  /// @param sqrtPriceX96 The sqrt price to convert
  /// @return priceX96 The price
  function getPriceX96FromSqrtPriceX96(uint160 sqrtPriceX96) private pure returns (uint256) {
    return FullMath.mulDiv(sqrtPriceX96, sqrtPriceX96, FixedPoint96.Q96);
  }

  /// @notice Convert priceX96 to price
  /// @param priceX96 The price to convert
  /// @param decimals The decimals of the price
  /// @return price The price
  function getActualPrice(uint256 priceX96, uint256 decimals) private pure returns (uint256) {
    return (priceX96 * (10 ** decimals)) / 2 ** 96;
  }

  /// @notice Get the adjusted decimals of a pool towards a quote token
  /// @param pool The Uniswap v3 pool to convert the decimals of
  /// @param quoteToken The token to quote the price in terms of
  /// @return decimals The adjusted decimals
  function getAdjustedDecimals(
    IUniswapV3Pool pool,
    address quoteToken
  ) private view returns (uint256) {
    uint256 t0Decimals = IERC20Metadata(pool.token0()).decimals();
    uint256 t1Decimals = IERC20Metadata(pool.token1()).decimals();
    if (pool.token1() == quoteToken) {
      if (t1Decimals < t0Decimals) {
        return 18 + t0Decimals - t1Decimals;
      } else if (t1Decimals > t0Decimals) {
        return 18 - (t1Decimals - t0Decimals);
      }
    }
    if (pool.token0() == quoteToken) {
      if (t1Decimals < t0Decimals) {
        return 18 - (t0Decimals - t1Decimals);
      } else if (t1Decimals > t0Decimals) {
        return 18 + (t1Decimals - t0Decimals);
      }
    }
    return 18;
  }
}
