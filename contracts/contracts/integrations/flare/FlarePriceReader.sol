// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @notice Interface for Flare FTSO registry
interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory _symbol)
        external
        view
        returns (uint256 _price, uint256 _timestamp, uint256 _decimals);
    
    function getCurrentPrice(string memory _symbol)
        external
        view
        returns (uint256 _price, uint256 _timestamp);
}

/**
 * @title FlarePriceReader
 * @notice Reads price feeds from Flare Time Series Oracle (FTSO)
 * @dev Integrates with Flare's decentralized price oracle for DeFi operations
 */
contract FlarePriceReader is Ownable2Step {

    /// @notice FTSO Registry contract address (Coston2: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019)
    IFtsoRegistry public ftsoRegistry;

    /// @notice Supported token symbols
    mapping(string => bool) public supportedSymbols;

    /// @notice Price staleness threshold (5 minutes)
    uint256 public constant MAX_PRICE_AGE = 5 minutes;

    /// @notice Events
    event FtsoRegistryUpdated(address indexed newRegistry);
    event SymbolSupported(string indexed symbol, bool supported);
    event PriceRead(string indexed symbol, uint256 price, uint256 timestamp);

    /// @notice Custom errors
    error InvalidRegistry();
    error UnsupportedSymbol();
    error StalePrice();
    error PriceNotAvailable();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param _ftsoRegistry Address of the FTSO registry
     */
    constructor(
        address initialOwner,
        address _ftsoRegistry
    ) Ownable(initialOwner) {
        if (_ftsoRegistry == address(0)) revert InvalidRegistry();
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        
        // Initialize with common trading pairs
        supportedSymbols["FLR"] = true;
        supportedSymbols["USDC"] = true;
        supportedSymbols["USDT"] = true;
        supportedSymbols["BTC"] = true;
        supportedSymbols["ETH"] = true;
        supportedSymbols["XRP"] = true;
    }

    /**
     * @notice Get current price for a symbol
     * @param symbol Token symbol (e.g., "FLR", "USDC")
     * @return price Price in USD with decimals
     * @return decimals Number of decimals
     * @return timestamp Price timestamp
     */
    function getPrice(string memory symbol)
        external
        view
        returns (uint256 price, uint256 decimals, uint256 timestamp)
    {
        if (!supportedSymbols[symbol]) revert UnsupportedSymbol();

        (price, timestamp, decimals) = ftsoRegistry.getCurrentPriceWithDecimals(symbol);
        
        if (price == 0) revert PriceNotAvailable();
        if (block.timestamp > timestamp + MAX_PRICE_AGE) revert StalePrice();
    }

    /**
     * @notice Get price ratio between two tokens
     * @param baseSymbol Base token symbol
     * @param quoteSymbol Quote token symbol
     * @return ratio Price ratio with 18 decimals
     * @return timestamp Latest timestamp of the two prices
     */
    function getPriceRatio(
        string memory baseSymbol,
        string memory quoteSymbol
    ) external view returns (uint256 ratio, uint256 timestamp) {
        if (!supportedSymbols[baseSymbol]) revert UnsupportedSymbol();
        if (!supportedSymbols[quoteSymbol]) revert UnsupportedSymbol();

        (uint256 basePrice, uint256 baseTimestamp, uint256 baseDecimals) = 
            ftsoRegistry.getCurrentPriceWithDecimals(baseSymbol);
        (uint256 quotePrice, uint256 quoteTimestamp, uint256 quoteDecimals) = 
            ftsoRegistry.getCurrentPriceWithDecimals(quoteSymbol);

        if (basePrice == 0 || quotePrice == 0) revert PriceNotAvailable();
        
        timestamp = baseTimestamp < quoteTimestamp ? baseTimestamp : quoteTimestamp;
        
        if (block.timestamp > timestamp + MAX_PRICE_AGE) revert StalePrice();

        // Normalize to 18 decimals
        ratio = (basePrice * 10**(18 + quoteDecimals)) / (quotePrice * 10**baseDecimals);
    }

    /**
     * @notice Convert amount from one token to another using FTSO prices
     * @param amount Amount to convert
     * @param fromSymbol Source token symbol
     * @param toSymbol Target token symbol
     * @return convertedAmount Amount in target token
     */
    function convertAmount(
        uint256 amount,
        string memory fromSymbol,
        string memory toSymbol
    ) external view returns (uint256 convertedAmount) {
        if (!supportedSymbols[fromSymbol]) revert UnsupportedSymbol();
        if (!supportedSymbols[toSymbol]) revert UnsupportedSymbol();

        (uint256 fromPrice, uint256 fromTimestamp, uint256 fromDecimals) = 
            ftsoRegistry.getCurrentPriceWithDecimals(fromSymbol);
        (uint256 toPrice, uint256 toTimestamp, uint256 toDecimals) = 
            ftsoRegistry.getCurrentPriceWithDecimals(toSymbol);

        if (fromPrice == 0 || toPrice == 0) revert PriceNotAvailable();

        uint256 latestTimestamp = fromTimestamp < toTimestamp ? fromTimestamp : toTimestamp;
        if (block.timestamp > latestTimestamp + MAX_PRICE_AGE) revert StalePrice();

        // Convert: amount * fromPrice / toPrice, adjusting for decimals
        convertedAmount = (amount * fromPrice * 10**toDecimals) / (toPrice * 10**fromDecimals);
    }

    /**
     * @notice Check if a price is fresh
     * @param symbol Token symbol
     * @return True if price is fresh
     */
    function isPriceFresh(string memory symbol) external view returns (bool) {
        if (!supportedSymbols[symbol]) return false;

        try ftsoRegistry.getCurrentPrice(symbol) returns (uint256, uint256 timestamp) {
            return block.timestamp <= timestamp + MAX_PRICE_AGE;
        } catch {
            return false;
        }
    }

    /**
     * @notice Update FTSO registry address
     * @param _ftsoRegistry New registry address
     */
    function setFtsoRegistry(address _ftsoRegistry) external onlyOwner {
        if (_ftsoRegistry == address(0)) revert InvalidRegistry();
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        emit FtsoRegistryUpdated(_ftsoRegistry);
    }

    /**
     * @notice Add or remove supported symbol
     * @param symbol Token symbol
     * @param supported Whether to support this symbol
     */
    function setSupportedSymbol(string memory symbol, bool supported) external onlyOwner {
        supportedSymbols[symbol] = supported;
        emit SymbolSupported(symbol, supported);
    }

    /**
     * @notice Batch add supported symbols
     * @param symbols Array of token symbols
     */
    function addSupportedSymbols(string[] memory symbols) external onlyOwner {
        for (uint256 i = 0; i < symbols.length; i++) {
            supportedSymbols[symbols[i]] = true;
            emit SymbolSupported(symbols[i], true);
        }
    }
}
