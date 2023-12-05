// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceConvert {
		AggregatorV3Interface internal linkUsdPriceFeed;
		AggregatorV3Interface internal ethUsdPriceFeed;

		constructor(address _linkUsdPriceFeed, address _ethUsdPriceFeed) {
				linkUsdPriceFeed = AggregatorV3Interface(_linkUsdPriceFeed);
				ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
		}

		function getLinkPrice() internal view returns (uint256) {
				(, int256 price, , , ) = linkUsdPriceFeed.latestRoundData();
				return uint256(price);
		}

		function getEthPrice() internal view returns (uint256) {
				(, int256 price, , , ) = ethUsdPriceFeed.latestRoundData();
				return uint256(price);
		}

		function getLinkGasUsed(uint256 _ethAmount) external view returns (uint256) {
				uint256 linkPrice = getLinkPrice();
				uint256 ethPrice = getEthPrice();
				uint256 linkGasUsed = (_ethAmount * ethPrice) / linkPrice;
				return linkGasUsed;
		}
}