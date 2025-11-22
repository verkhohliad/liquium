// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DealPosition.sol";
import "./ChannelRegistry.sol";
import "../integrations/flare/FlarePriceReader.sol";

/**
 * @title DealVault
 * @notice Main vault for LP deposits with state channel integration
 * @dev Integrates Yellow/Nitrolite channels, Flare FTSO pricing, and position NFTs
 */
contract DealVault is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Deal status
    enum DealStatus {
        Active,
        Locked,        // Deal locked, no new deposits allowed
        Settling,      // Settlement in progress with channel proof
        Finalized,
        Cancelled
    }

    /// @notice Deal parameters
    struct Deal {
        uint256 dealId;                // Unique deal identifier
        address depositToken;          // Token LPs deposit
        address targetToken;           // Token for trading/lending
        uint256 targetChainId;         // Target chain for operations
        uint256 minDeposit;            // Minimum deposit amount
        uint256 maxDeposit;            // Maximum deposit amount
        uint256 totalDeposited;        // Total amount deposited
        uint256 startTime;             // Deal start timestamp
        uint256 duration;              // Deal duration in seconds
        DealStatus status;             // Current deal status
        uint256 expectedYield;         // Expected yield in basis points
        bytes32 channelId;             // Associated state channel ID
    }

    /// @notice Position NFT contract
    DealPosition public immutable positionNFT;

    /// @notice Channel registry
    ChannelRegistry public immutable channelRegistry;

    /// @notice Price reader
    FlarePriceReader public immutable priceReader;

    /// @notice Counter for deal IDs
    uint256 private _nextDealId;

    /// @notice Mapping from deal ID to deal data
    mapping(uint256 => Deal) public deals;

    /// @notice Mapping from position token ID to deal ID
    mapping(uint256 => uint256) public positionDeals;

    /// @notice Mapping from token address to FTSO symbol
    mapping(address => string) public tokenSymbols;

    /// @notice Protocol fee in basis points (100 = 1%)
    uint256 public protocolFeeBps = 100;

    /// @notice Fee recipient
    address public feeRecipient;

    /// @notice Minimum deal duration (1 day)
    uint256 public constant MIN_DEAL_DURATION = 1 days;

    /// @notice Maximum deal duration (365 days)
    uint256 public constant MAX_DEAL_DURATION = 365 days;

    /// @notice Events
    event DealCreated(
        uint256 indexed dealId,
        address depositToken,
        address targetToken,
        uint256 targetChainId,
        uint256 duration
    );
    event DealLocked(uint256 indexed dealId, bytes32 indexed channelId);
    event DealSettling(uint256 indexed dealId, uint256 finalPnL);
    event Deposited(
        uint256 indexed dealId,
        address indexed depositor,
        uint256 indexed positionId,
        uint256 amount
    );
    event PositionClaimed(
        uint256 indexed dealId,
        uint256 indexed positionId,
        address indexed recipient,
        uint256 principal,
        uint256 yield
    );
    event Withdrawn(
        uint256 indexed dealId,
        uint256 indexed positionId,
        address indexed recipient,
        uint256 amount,
        uint256 yield
    );
    event DealFinalized(uint256 indexed dealId, uint256 totalYield);
    event DealCancelled(uint256 indexed dealId);
    event ProtocolFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed newRecipient);

    /// @notice Custom errors
    error InvalidDeal();
    error DealNotActive();
    error DealNotLocked();
    error DealNotSettling();
    error DealNotFinalized();
    error InvalidDepositAmount();
    error InvalidDuration();
    error InvalidPosition();
    error InvalidChannelProof();
    error PositionAlreadyClaimed();
    error DealStillActive();
    error UnauthorizedWithdrawal();
    error ChannelNotLinked();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param _positionNFT Position NFT contract address
     * @param _channelRegistry Channel registry address
     * @param _priceReader Price reader address
     * @param _feeRecipient Initial fee recipient
     */
    constructor(
        address initialOwner,
        address _positionNFT,
        address _channelRegistry,
        address _priceReader,
        address _feeRecipient
    ) Ownable(initialOwner) {
        positionNFT = DealPosition(_positionNFT);
        channelRegistry = ChannelRegistry(_channelRegistry);
        priceReader = FlarePriceReader(_priceReader);
        feeRecipient = _feeRecipient;
        _nextDealId = 1;
    }

    /**
     * @notice Create a new deal
     * @param depositToken Token LPs will deposit
     * @param targetToken Token for operations
     * @param targetChainId Target chain ID
     * @param minDeposit Minimum deposit amount
     * @param maxDeposit Maximum deposit amount
     * @param duration Deal duration in seconds
     * @param expectedYield Expected yield in basis points
     * @return dealId The created deal ID
     */
    function createDeal(
        address depositToken,
        address targetToken,
        uint256 targetChainId,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 duration,
        uint256 expectedYield
    ) external onlyOwner returns (uint256 dealId) {
        if (duration < MIN_DEAL_DURATION || duration > MAX_DEAL_DURATION) {
            revert InvalidDuration();
        }
        if (minDeposit == 0 || maxDeposit < minDeposit) {
            revert InvalidDepositAmount();
        }

        dealId = _nextDealId++;

        deals[dealId] = Deal({
            dealId: dealId,
            depositToken: depositToken,
            targetToken: targetToken,
            targetChainId: targetChainId,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            totalDeposited: 0,
            startTime: block.timestamp,
            duration: duration,
            status: DealStatus.Active,
            expectedYield: expectedYield,
            channelId: bytes32(0)
        });

        emit DealCreated(dealId, depositToken, targetToken, targetChainId, duration);
    }

    /**
     * @notice Deposit into a deal
     * @param dealId Deal identifier
     * @param amount Amount to deposit
     * @return positionId Minted position NFT ID
     */
    function deposit(uint256 dealId, uint256 amount) 
        external 
        nonReentrant 
        returns (uint256 positionId) 
    {
        Deal storage deal = deals[dealId];
        
        if (deal.status != DealStatus.Active) revert DealNotActive();
        if (amount < deal.minDeposit || amount > deal.maxDeposit) {
            revert InvalidDepositAmount();
        }
        if (block.timestamp >= deal.startTime + deal.duration) {
            revert DealNotActive();
        }

        // Transfer tokens
        IERC20(deal.depositToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update total deposited
        deal.totalDeposited += amount;

        // Mint position NFT
        positionId = positionNFT.mint(msg.sender, dealId, amount);
        positionDeals[positionId] = dealId;

        emit Deposited(dealId, msg.sender, positionId, amount);
    }

    /**
     * @notice Withdraw from a finalized deal
     * @param positionId Position NFT ID
     */
    function withdraw(uint256 positionId) external nonReentrant {
        // Verify ownership
        if (positionNFT.ownerOf(positionId) != msg.sender) {
            revert UnauthorizedWithdrawal();
        }

        uint256 dealId = positionDeals[positionId];
        Deal storage deal = deals[dealId];

        if (deal.status != DealStatus.Finalized) revert DealNotFinalized();

        // Get position data
        DealPosition.Position memory position = positionNFT.getPosition(positionId);
        if (position.claimed) revert PositionAlreadyClaimed();

        // Calculate yield (simplified - in production would use actual returns)
        uint256 yieldAmount = (position.depositAmount * deal.expectedYield) / 10000;
        
        // Calculate protocol fee
        uint256 fee = (yieldAmount * protocolFeeBps) / 10000;
        uint256 netYield = yieldAmount - fee;

        // Total to withdraw
        uint256 totalAmount = position.depositAmount + netYield;

        // Burn position NFT
        positionNFT.burn(positionId);

        // Transfer tokens
        IERC20(deal.depositToken).safeTransfer(msg.sender, totalAmount);
        
        if (fee > 0) {
            IERC20(deal.depositToken).safeTransfer(feeRecipient, fee);
        }

        emit Withdrawn(dealId, positionId, msg.sender, position.depositAmount, netYield);
    }

    /**
     * @notice Lock a deal to prevent new deposits
     * @param dealId Deal identifier
     * @dev Opens Yellow channel and transitions to Locked state
     */
    function lockDeal(uint256 dealId) external onlyOwner {
        Deal storage deal = deals[dealId];
        
        if (deal.status != DealStatus.Active) revert DealNotActive();
        if (deal.channelId == bytes32(0)) revert ChannelNotLinked();
        
        // Transition to Locked state
        deal.status = DealStatus.Locked;
        
        emit DealLocked(dealId, deal.channelId);
    }

    /**
     * @notice Settle a deal with channel proof and compute final PnL
     * @param dealId Deal identifier
     * @param channelProof Proof from Yellow channel settlement
     * @dev Validates channel proof, computes PnL using FTSO, transitions to Settling
     */
    function settleDeal(uint256 dealId, bytes calldata channelProof) external onlyOwner {
        Deal storage deal = deals[dealId];
        
        if (deal.status != DealStatus.Locked) revert DealNotLocked();
        if (deal.channelId == bytes32(0)) revert ChannelNotLinked();
        
        // Validate channel proof (simplified - in production would verify signatures)
        if (channelProof.length < 32) revert InvalidChannelProof();
        
        // Compute final PnL using FTSO prices
        uint256 finalPnL = _computeFinalPnL(dealId);
        
        // Transition to Settling state
        deal.status = DealStatus.Settling;
        
        emit DealSettling(dealId, finalPnL);
    }

    /**
     * @notice Claim position returns after settlement
     * @param positionId Position NFT ID
     * @dev Separate from withdraw - allows claiming without burning NFT immediately
     */
    function claimPosition(uint256 positionId) external nonReentrant {
        // Verify ownership
        if (positionNFT.ownerOf(positionId) != msg.sender) {
            revert UnauthorizedWithdrawal();
        }

        uint256 dealId = positionDeals[positionId];
        Deal storage deal = deals[dealId];

        if (deal.status != DealStatus.Settling && deal.status != DealStatus.Finalized) {
            revert DealNotSettling();
        }

        // Get position data
        DealPosition.Position memory position = positionNFT.getPosition(positionId);
        if (position.claimed) revert PositionAlreadyClaimed();

        // Compute actual PnL using FTSO prices
        uint256 yieldAmount = _computePositionYield(dealId, position.depositAmount);
        
        // Calculate protocol fee
        uint256 fee = (yieldAmount * protocolFeeBps) / 10000;
        uint256 netYield = yieldAmount - fee;

        // Total to claim
        uint256 totalAmount = position.depositAmount + netYield;

        // Mark as claimed (but don't burn NFT yet)
        positionNFT.markClaimed(positionId);

        // Transfer tokens
        IERC20(deal.depositToken).safeTransfer(msg.sender, totalAmount);
        
        if (fee > 0) {
            IERC20(deal.depositToken).safeTransfer(feeRecipient, fee);
        }

        emit PositionClaimed(dealId, positionId, msg.sender, position.depositAmount, netYield);
    }

    /**
     * @notice Set FTSO symbol for token address
     * @param tokenAddress Token contract address
     * @param symbol FTSO symbol (e.g., "USDC", "BTC", "ETH")
     */
    function setTokenSymbol(address tokenAddress, string memory symbol) external onlyOwner {
        tokenSymbols[tokenAddress] = symbol;
    }

    /**
     * @notice Batch set token symbols
     * @param tokenAddresses Array of token addresses
     * @param symbols Array of FTSO symbols
     */
    function setTokenSymbols(
        address[] memory tokenAddresses,
        string[] memory symbols
    ) external onlyOwner {
        require(tokenAddresses.length == symbols.length, "Length mismatch");
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            tokenSymbols[tokenAddresses[i]] = symbols[i];
        }
    }

    /**
     * @notice Compute final PnL using FTSO price feeds
     * @param dealId Deal identifier
     * @return Final PnL in basis points
     */
    function _computeFinalPnL(uint256 dealId) internal view returns (uint256) {
        Deal storage deal = deals[dealId];
        
        // Get FTSO symbols for tokens
        string memory depositSymbol = tokenSymbols[deal.depositToken];
        string memory targetSymbol = tokenSymbols[deal.targetToken];
        
        // If symbols not configured, use expected yield
        if (bytes(depositSymbol).length == 0 || bytes(targetSymbol).length == 0) {
            return deal.expectedYield;
        }
        
        // Get price ratio from FTSO
        try priceReader.getPriceRatio(depositSymbol, targetSymbol) returns (
            uint256 ratio,
            uint256 /* timestamp */
        ) {
            // Calculate actual yield based on price movement
            // ratio > 1e18 means depositToken gained value vs targetToken
            if (ratio > 1e18) {
                return ((ratio - 1e18) * 10000) / 1e18; // Convert to basis points
            }
            // If ratio <= 1e18, no positive yield
            return 0;
        } catch {
            // Fallback to expected yield if price feed fails
            return deal.expectedYield;
        }
    }

    /**
     * @notice Compute position-specific yield
     * @param dealId Deal identifier
     * @param depositAmount Position deposit amount
     * @return Yield amount in deposit token
     */
    function _computePositionYield(uint256 dealId, uint256 depositAmount) internal view returns (uint256) {
        uint256 finalPnL = _computeFinalPnL(dealId);
        return (depositAmount * finalPnL) / 10000;
    }

    /**
     * @notice Finalize a deal
     * @param dealId Deal identifier
     */
    function finalizeDeal(uint256 dealId) external onlyOwner {
        Deal storage deal = deals[dealId];
        
        if (deal.status != DealStatus.Active) revert InvalidDeal();
        if (block.timestamp < deal.startTime + deal.duration) {
            revert DealStillActive();
        }

        deal.status = DealStatus.Finalized;

        emit DealFinalized(dealId, 0); // TODO: Calculate actual yield
    }

    /**
     * @notice Cancel a deal (emergency only)
     * @param dealId Deal identifier
     */
    function cancelDeal(uint256 dealId) external onlyOwner {
        Deal storage deal = deals[dealId];
        
        if (deal.status != DealStatus.Active) revert InvalidDeal();

        deal.status = DealStatus.Cancelled;

        emit DealCancelled(dealId);
    }

    /**
     * @notice Link deal to state channel
     * @param dealId Deal identifier
     * @param channelId Channel identifier
     */
    function linkChannel(uint256 dealId, bytes32 channelId) external onlyOwner {
        Deal storage deal = deals[dealId];
        if (deal.status != DealStatus.Active) revert DealNotActive();
        
        deal.channelId = channelId;
    }

    /**
     * @notice Update protocol fee
     * @param newFeeBps New fee in basis points
     */
    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Get deal information
     * @param dealId Deal identifier
     * @return Deal data
     */
    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }

    /**
     * @notice Check if deal is active
     * @param dealId Deal identifier
     * @return True if deal is active
     */
    function isDealActive(uint256 dealId) external view returns (bool) {
        Deal storage deal = deals[dealId];
        return deal.status == DealStatus.Active && 
               block.timestamp < deal.startTime + deal.duration;
    }

    /**
     * @notice Get expected return for a position
     * @param positionId Position NFT ID
     * @return Expected total return (principal + yield)
     */
    function getExpectedReturn(uint256 positionId) external view returns (uint256) {
        uint256 dealId = positionDeals[positionId];
        Deal storage deal = deals[dealId];
        
        DealPosition.Position memory position = positionNFT.getPosition(positionId);
        
        uint256 yieldAmount = (position.depositAmount * deal.expectedYield) / 10000;
        uint256 fee = (yieldAmount * protocolFeeBps) / 10000;
        
        return position.depositAmount + yieldAmount - fee;
    }
}
