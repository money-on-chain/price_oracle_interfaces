import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the canonical USDRIF/USD provider and its Chainlink-compatible adapter.
 *
 * The network-specific RoC guard and DOC bucket come from the parameter files.
 * Those values are sourced from github.com/money-on-chain/address-book, while
 * the adapter's 30-second block-time estimate is an explicit deployment policy.
 */
const UsdRifUsdModule = buildModule("UsdRifUsd", (m) => {
  const mocMultiCollateralGuard = m.getParameter<string>("mocMultiCollateralGuard");
  const docBucket = m.getParameter<string>("docBucket");
  const averageBlockTimeSeconds = m.getParameter("averageBlockTimeSeconds", 30);

  const priceProvider = m.contract("PriceProviderUsdRifUsd", [mocMultiCollateralGuard, docBucket], {
    id: "PriceProviderUsdRifUsd",
  });
  const chainlinkAdapter = m.contract(
    "UsdRifUsdPriceChainlinkCompat",
    [priceProvider, averageBlockTimeSeconds],
    { id: "UsdRifUsdPriceChainlinkCompat" },
  );

  return { priceProvider, chainlinkAdapter };
});

export default UsdRifUsdModule;
