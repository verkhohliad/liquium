// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./DealPosition.sol";
import "./ChannelRegistry.sol";
import "./DealVault.sol";
import "../integrations/flare/FlarePriceReader.sol";

/**
 * @title DealFactory
 * @notice Factory contract for deploying and managing Deal infrastructure
 * @dev Simplifies deployment and provides a registry of all vaults
 */
contract DealFactory is Ownable2Step {
    /// @notice Position NFT contract
    DealPosition public immutable positionNFT;

    /// @notice Channel registry
    ChannelRegistry public immutable channelRegistry;

    /// @notice Price reader
    FlarePriceReader public immutable priceReader;

    /// @notice Array of all deployed vaults
    address[] public vaults;

    /// @notice Mapping to check if address is a vault
    mapping(address => bool) public isVault;

    /// @notice Default fee recipient
    address public defaultFeeRecipient;

    /// @notice Events
    event VaultDeployed(address indexed vault, address indexed creator);
    event DefaultFeeRecipientUpdated(address indexed newRecipient);

    /// @notice Custom errors
    error InvalidAddress();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param ftsoRegistry Address of the FTSO registry for price feeds
     * @param _defaultFeeRecipient Default fee recipient for new vaults
     */
    constructor(
        address initialOwner,
        address ftsoRegistry,
        address _defaultFeeRecipient
    ) Ownable(initialOwner) {
        if (ftsoRegistry == address(0) || _defaultFeeRecipient == address(0)) {
            revert InvalidAddress();
        }

        // Deploy core infrastructure
        positionNFT = new DealPosition(address(this));
        channelRegistry = new ChannelRegistry(address(this));
        priceReader = new FlarePriceReader(address(this), ftsoRegistry);
        
        defaultFeeRecipient = _defaultFeeRecipient;

        // Transfer ownership to initialOwner
        positionNFT.transferOwnership(initialOwner);
        channelRegistry.transferOwnership(initialOwner);
        priceReader.transferOwnership(initialOwner);
    }

    /**
     * @notice Deploy a new DealVault
     * @param feeRecipient Fee recipient for this vault (use address(0) for default)
     * @return vault Address of the deployed vault
     */
    function deployVault(address feeRecipient) 
        external 
        onlyOwner 
        returns (address vault) 
    {
        address recipient = feeRecipient == address(0) ? defaultFeeRecipient : feeRecipient;
        
        // Deploy new vault
        DealVault newVault = new DealVault(
            owner(),
            address(positionNFT),
            address(channelRegistry),
            address(priceReader),
            recipient
        );

        vault = address(newVault);
        
        // Register vault
        vaults.push(vault);
        isVault[vault] = true;

        // Authorize vault to mint position NFTs
        positionNFT.setVaultAuthorization(vault, true);

        // Authorize vault as channel operator
        channelRegistry.setOperator(vault, true);

        emit VaultDeployed(vault, msg.sender);
    }

    /**
     * @notice Update default fee recipient
     * @param newRecipient New default fee recipient
     */
    function setDefaultFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        defaultFeeRecipient = newRecipient;
        emit DefaultFeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Get total number of deployed vaults
     * @return count Number of vaults
     */
    function getVaultCount() external view returns (uint256) {
        return vaults.length;
    }

    /**
     * @notice Get all deployed vaults
     * @return Array of vault addresses
     */
    function getAllVaults() external view returns (address[] memory) {
        return vaults;
    }

    /**
     * @notice Get vault at specific index
     * @param index Vault index
     * @return Vault address
     */
    function getVault(uint256 index) external view returns (address) {
        require(index < vaults.length, "Index out of bounds");
        return vaults[index];
    }

    /**
     * @notice Get core contract addresses
     * @return position Address of position NFT
     * @return registry Address of channel registry
     * @return prices Address of price reader
     */
    function getCoreContracts() 
        external 
        view 
        returns (
            address position,
            address registry,
            address prices
        ) 
    {
        return (
            address(positionNFT),
            address(channelRegistry),
            address(priceReader)
        );
    }
}
