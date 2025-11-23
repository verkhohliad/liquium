// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title MockPriceReader
 * @notice Mock price oracle for testing on chains without FTSO
 * @dev Returns fixed prices - FOR TESTING ONLY
 *
 * Usage: Deploy this on Base/other chains instead of FlarePriceReader
 * For production, integrate with Chainlink Price Feeds or similar
 */
contract MockPriceReader is Ownable2Step {

    /// @notice Mock prices with 18 decimals
    mapping(string => uint256) public prices;

    /// @notice Supported token symbols
    mapping(string => bool) public supportedSymbols;

    /// @notice Events
    event PriceUpdated(string indexed symbol, uint256 price);
    event SymbolSupported(string indexed symbol, bool supported);

    /// @notice Custom errors
    error UnsupportedSymbol();
    error PriceNotAvailable();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        // Initialize with mock prices (18 decimals)
        prices["USDC"] = 1e18;           // $1.00
        prices["USDT"] = 1e18;           // $1.00
        prices["DAI"] = 1e18;            // $1.00
        prices["BTC"] = 45000e18;        // $45,000
        prices["ETH"] = 2500e18;         // $2,500
        prices["FLR"] = 0.025e18;        // $0.025
        prices["XRP"] = 0.50e18;         // $0.50

        // Mark as supported
        supportedSymbols["USDC"] = true;
        supportedSymbols["USDT"] = true;
        supportedSymbols["DAI"] = true;
        supportedSymbols["BTC"] = true;
        supportedSymbols["ETH"] = true;
        supportedSymbols["FLR"] = true;
        supportedSymbols["XRP"] = true;
    }

    /**
     * @notice Get current price for a symbol
     * @param symbol Token symbol (e.g., "USDC", "BTC")
     * @return price Price in USD with 18 decimals
     * @return decimals Number of decimals (always 18)
     * @return timestamp Current block timestamp
     */
    function getPrice(string memory symbol)
        external
        view
        returns (uint256 price, uint256 decimals, uint256 timestamp)
    {
        if (!supportedSymbols[symbol]) revert UnsupportedSymbol();

        price = prices[symbol];
        if (price == 0) revert PriceNotAvailable();

        decimals = 18;
        timestamp = block.timestamp;
    }

    /**
     * @notice Get price ratio between two tokens
     * @param baseSymbol Base token symbol
     * @param quoteSymbol Quote token symbol
     * @return ratio Price ratio with 18 decimals
     * @return timestamp Current block timestamp
     */
    function getPriceRatio(
        string memory baseSymbol,
        string memory quoteSymbol
    ) external view returns (uint256 ratio, uint256 timestamp) {
        if (!supportedSymbols[baseSymbol]) revert UnsupportedSymbol();
        if (!supportedSymbols[quoteSymbol]) revert UnsupportedSymbol();

        uint256 basePrice = prices[baseSymbol];
        uint256 quotePrice = prices[quoteSymbol];

        if (basePrice == 0 || quotePrice == 0) revert PriceNotAvailable();

        // Calculate ratio: (basePrice / quotePrice) * 1e18
        ratio = (basePrice * 1e18) / quotePrice;
        timestamp = block.timestamp;
    }

    /**
     * @notice Convert amount from one token to another
     * @param fromSymbol Source token symbol
     * @param toSymbol Destination token symbol
     * @param amount Amount in source token
     * @return converted Converted amount in destination token
     */
    function convertAmount(
        string memory fromSymbol,
        string memory toSymbol,
        uint256 amount
    ) external view returns (uint256 converted) {
        if (!supportedSymbols[fromSymbol]) revert UnsupportedSymbol();
        if (!supportedSymbols[toSymbol]) revert UnsupportedSymbol();

        uint256 fromPrice = prices[fromSymbol];
        uint256 toPrice = prices[toSymbol];

        if (fromPrice == 0 || toPrice == 0) revert PriceNotAvailable();

        // converted = (amount * fromPrice) / toPrice
        converted = (amount * fromPrice) / toPrice;
    }

    /**
     * @notice Update price for a symbol (owner only)
     * @param symbol Token symbol
     * @param price New price with 18 decimals
     */
    function setPrice(string memory symbol, uint256 price) external onlyOwner {
        supportedSymbols[symbol] = true;
        prices[symbol] = price;
        emit PriceUpdated(symbol, price);
    }

    /**
     * @notice Update multiple prices (owner only)
     * @param symbols Array of token symbols
     * @param newPrices Array of prices with 18 decimals
     */
    function setPrices(
        string[] memory symbols,
        uint256[] memory newPrices
    ) external onlyOwner {
        require(symbols.length == newPrices.length, "Length mismatch");

        for (uint256 i = 0; i < symbols.length; i++) {
            supportedSymbols[symbols[i]] = true;
            prices[symbols[i]] = newPrices[i];
            emit PriceUpdated(symbols[i], newPrices[i]);
        }
    }

    /**
     * @notice Set symbol support status
     * @param symbol Token symbol
     * @param supported Whether symbol is supported
     */
    function setSupportedSymbol(string memory symbol, bool supported) external onlyOwner {
        supportedSymbols[symbol] = supported;
        emit SymbolSupported(symbol, supported);
    }

    /**
     * @notice Check if price is fresh (always true for mock)
     * @return True
     */
    function isPriceFresh(string memory /* symbol */) external pure returns (bool) {
        return true;
    }
}
