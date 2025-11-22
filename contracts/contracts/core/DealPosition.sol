// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title DealPosition
 * @notice ERC-721 NFT representing LP positions in deals
 * @dev Each position NFT represents a deposit in a specific deal vault
 */
contract DealPosition is ERC721, ERC721Enumerable, Ownable2Step {
    /// @notice Position metadata
    struct Position {
        uint256 dealId;           // ID of the deal this position belongs to
        uint256 depositAmount;    // Amount deposited (in deposit token decimals)
        uint256 depositTime;      // Timestamp of deposit
        bool claimed;             // Whether this position has been claimed
    }

    /// @notice Mapping from token ID to position data
    mapping(uint256 => Position) public positions;

    /// @notice Authorized deal vaults that can mint positions
    mapping(address => bool) public authorizedVaults;

    /// @notice Counter for position token IDs
    uint256 private _nextTokenId;

    /// @notice Events
    event VaultAuthorized(address indexed vault, bool authorized);
    event PositionMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 dealId,
        uint256 depositAmount
    );
    event PositionBurned(uint256 indexed tokenId, address indexed from);

    /// @notice Custom errors
    error UnauthorizedVault();
    error InvalidRecipient();
    error PositionAlreadyClaimed();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) 
        ERC721("Liquium Position", "LIQ-POS") 
        Ownable(initialOwner)
    {
        _nextTokenId = 1; // Start token IDs at 1
    }

    /**
     * @notice Mint a new position NFT
     * @param to Address to mint the NFT to
     * @param dealId ID of the deal
     * @param depositAmount Amount deposited
     * @return tokenId The ID of the minted token
     */
    function mint(
        address to,
        uint256 dealId,
        uint256 depositAmount
    ) external returns (uint256 tokenId) {
        if (!authorizedVaults[msg.sender]) revert UnauthorizedVault();
        if (to == address(0)) revert InvalidRecipient();

        tokenId = _nextTokenId++;
        
        positions[tokenId] = Position({
            dealId: dealId,
            depositAmount: depositAmount,
            depositTime: block.timestamp,
            claimed: false
        });

        _safeMint(to, tokenId);

        emit PositionMinted(tokenId, to, dealId, depositAmount);
    }

    /**
     * @notice Mark a position as claimed without burning
     * @param tokenId Token ID to mark as claimed
     * @dev Used when position is claimed but NFT kept as receipt
     */
    function markClaimed(uint256 tokenId) external {
        if (!authorizedVaults[msg.sender]) revert UnauthorizedVault();
        if (positions[tokenId].claimed) revert PositionAlreadyClaimed();

        positions[tokenId].claimed = true;
    }

    /**
     * @notice Burn a position NFT when claimed
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        if (!authorizedVaults[msg.sender]) revert UnauthorizedVault();
        if (positions[tokenId].claimed) revert PositionAlreadyClaimed();

        positions[tokenId].claimed = true;
        _burn(tokenId);

        emit PositionBurned(tokenId, ownerOf(tokenId));
    }

    /**
     * @notice Authorize or deauthorize a vault to mint/burn positions
     * @param vault Address of the vault
     * @param authorized Whether to authorize or deauthorize
     */
    function setVaultAuthorization(address vault, bool authorized) external onlyOwner {
        authorizedVaults[vault] = authorized;
        emit VaultAuthorized(vault, authorized);
    }

    /**
     * @notice Get position data
     * @param tokenId Token ID to query
     * @return Position data
     */
    function getPosition(uint256 tokenId) external view returns (Position memory) {
        return positions[tokenId];
    }

    /**
     * @notice Get all positions owned by an address
     * @param owner Address to query
     * @return tokenIds Array of token IDs owned by the address
     */
    function getPositionsByOwner(address owner) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(owner);
        tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
    }

    /**
     * @notice Override required by Solidity for multiple inheritance
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Override required by Solidity for multiple inheritance
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @notice Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
