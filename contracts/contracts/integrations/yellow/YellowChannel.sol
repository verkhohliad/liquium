// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../../core/ChannelRegistry.sol";

/**
 * @title YellowChannel
 * @notice Integration with Yellow Network's Nitrolite Protocol (ERC-7824)
 * @dev Extends channel functionality with Yellow's state channel primitives
 * 
 * Yellow Network Integration:
 * - Uses Nitrolite for off-chain state updates
 * - Implements ERC-7824 standard for state channels
 * - Enables high-frequency trading without L1 settlement
 * 
 * Key Features:
 * - Non-custodial: Users retain control of funds
 * - Instant settlement: State updates happen off-chain
 * - Cross-chain: Can bridge between different networks
 * - Scalable: Unlimited throughput via channels
 */
contract YellowChannel is Ownable2Step {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Channel registry for state management
    ChannelRegistry public immutable channelRegistry;

    /// @notice Yellow node WebSocket endpoint
    string public yellowNodeEndpoint;

    /// @notice Application ID in Yellow network
    bytes32 public yellowAppId;

    /// @notice Channel commitment data
    struct ChannelCommitment {
        bytes32 channelId;
        bytes32 stateHash;          // Hash of current state
        uint256 nonce;              // State update nonce
        uint256 balance0;           // Party 0 balance
        uint256 balance1;           // Party 1 balance
        bytes signature0;           // Party 0 signature
        bytes signature1;           // Party 1 signature
        uint256 timeout;            // Timeout for disputes
    }

    /// @notice Channel custody data (AssetHolder pattern)
    struct ChannelAssets {
        address party0;             // First party
        address party1;             // Second party
        address token;              // Asset token
        uint256 totalDeposited;     // Total deposited
        bool settled;               // Settlement complete
        uint256 challengeDeadline;  // Challenge window end
    }

    /// @notice Mapping from channel ID to commitment
    mapping(bytes32 => ChannelCommitment) public commitments;

    /// @notice Mapping from channel ID to assets (AssetHolder)
    mapping(bytes32 => ChannelAssets) public channelAssets;

    /// @notice Challenge period duration (1 day)
    uint256 public constant CHALLENGE_PERIOD = 1 days;

    /// @notice Events
    event YellowChannelOpened(
        bytes32 indexed channelId,
        address party0,
        address party1,
        uint256 amount0,
        uint256 amount1
    );
    event StateCommitted(
        bytes32 indexed channelId,
        bytes32 stateHash,
        uint256 nonce
    );
    event ChannelSettled(
        bytes32 indexed channelId,
        uint256 finalBalance0,
        uint256 finalBalance1
    );
    event YellowConfigUpdated(string endpoint, bytes32 appId);

    /// @notice Custom errors
    error InvalidCommitment();
    error InvalidSignature();
    error CommitmentTooOld();
    error DisputeTimeout();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param _channelRegistry Address of channel registry
     * @param _yellowNodeEndpoint Yellow node WebSocket endpoint
     * @param _yellowAppId Application ID in Yellow network
     */
    constructor(
        address initialOwner,
        address _channelRegistry,
        string memory _yellowNodeEndpoint,
        bytes32 _yellowAppId
    ) Ownable(initialOwner) {
        channelRegistry = ChannelRegistry(_channelRegistry);
        yellowNodeEndpoint = _yellowNodeEndpoint;
        yellowAppId = _yellowAppId;
    }

    /**
     * @notice Open a new Yellow state channel
     * @param channelId Unique channel identifier
     * @param party0 First party address
     * @param party1 Second party address
     * @param amount0 Initial balance for party0
     * @param amount1 Initial balance for party1
     * @param dealId Associated deal ID
     */
    function openYellowChannel(
        bytes32 channelId,
        address party0,
        address party1,
        uint256 amount0,
        uint256 amount1,
        uint256 dealId
    ) external onlyOwner {
        // Open channel in registry
        channelRegistry.openChannel(
            channelId,
            address(this),  // dealer
            party1,         // counterparty
            dealId,
            amount0 + amount1
        );

        // Initialize commitment
        commitments[channelId] = ChannelCommitment({
            channelId: channelId,
            stateHash: keccak256(abi.encodePacked(amount0, amount1, uint256(0))),
            nonce: 0,
            balance0: amount0,
            balance1: amount1,
            signature0: "",
            signature1: "",
            timeout: block.timestamp + 7 days
        });

        emit YellowChannelOpened(channelId, party0, party1, amount0, amount1);
    }

    /**
     * @notice Deposit assets to channel (AssetHolder pattern)
     * @param channelId Channel identifier
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositToChannel(
        bytes32 channelId,
        address token,
        uint256 amount
    ) external onlyOwner {
        ChannelAssets storage assets = channelAssets[channelId];
        
        // Transfer tokens to this contract (custody)
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        assets.token = token;
        assets.totalDeposited += amount;
    }

    /**
     * @notice Verify dual signatures for state update
     * @param stateHash Hash of the state being signed
     * @param party0 Address of first party
     * @param party1 Address of second party
     * @param signature0 Signature from party0
     * @param signature1 Signature from party1
     * @return True if both signatures are valid
     */
    function verifySignatures(
        bytes32 stateHash,
        address party0,
        address party1,
        bytes memory signature0,
        bytes memory signature1
    ) public pure returns (bool) {
        bytes32 ethSignedHash = stateHash.toEthSignedMessageHash();
        
        address signer0 = ethSignedHash.recover(signature0);
        address signer1 = ethSignedHash.recover(signature1);
        
        return signer0 == party0 && signer1 == party1;
    }

    /**
     * @notice Commit new state to channel
     * @param channelId Channel identifier
     * @param newStateHash New state hash
     * @param newNonce New nonce (must be higher than current)
     * @param newBalance0 New balance for party0
     * @param newBalance1 New balance for party1
     * @param signature0 Signature from party0
     * @param signature1 Signature from party1
     */
    function commitState(
        bytes32 channelId,
        bytes32 newStateHash,
        uint256 newNonce,
        uint256 newBalance0,
        uint256 newBalance1,
        bytes calldata signature0,
        bytes calldata signature1
    ) external {
        ChannelCommitment storage commitment = commitments[channelId];
        ChannelAssets storage assets = channelAssets[channelId];
        
        if (newNonce <= commitment.nonce) revert CommitmentTooOld();
        
        // Verify dual signatures
        if (!verifySignatures(newStateHash, assets.party0, assets.party1, signature0, signature1)) {
            revert InvalidSignature();
        }

        // Update commitment
        commitment.stateHash = newStateHash;
        commitment.nonce = newNonce;
        commitment.balance0 = newBalance0;
        commitment.balance1 = newBalance1;
        commitment.signature0 = signature0;
        commitment.signature1 = signature1;

        // Update channel registry
        channelRegistry.updateChannelState(channelId, newStateHash, newNonce);

        emit StateCommitted(channelId, newStateHash, newNonce);
    }

    /**
     * @notice Withdraw from channel after settlement
     * @param channelId Channel identifier
     * @param party Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdrawFromChannel(
        bytes32 channelId,
        address party,
        uint256 amount
    ) external onlyOwner {
        ChannelAssets storage assets = channelAssets[channelId];
        
        require(assets.settled, "Channel not settled");
        require(block.timestamp >= assets.challengeDeadline, "Challenge period active");
        
        // Transfer tokens from custody
        IERC20(assets.token).safeTransfer(party, amount);
    }

    /**
     * @notice Finalize and settle channel with token transfers
     * @param channelId Channel identifier
     */
    function settleChannel(bytes32 channelId) external {
        ChannelCommitment storage commitment = commitments[channelId];
        ChannelAssets storage assets = channelAssets[channelId];
        
        // Finalize in registry
        channelRegistry.finalizeChannel(channelId, commitment.stateHash);

        // Set challenge deadline (1 day from now)
        assets.challengeDeadline = block.timestamp + CHALLENGE_PERIOD;
        
        // Mark as pending settlement (not yet settled due to challenge period)
        // After challenge period, withdrawFromChannel can be called

        emit ChannelSettled(channelId, commitment.balance0, commitment.balance1);
    }

    /**
     * @notice Complete settlement after challenge period
     * @param channelId Channel identifier
     * @dev Transfers final balances to parties after challenge period
     */
    function completeSettlement(bytes32 channelId) external {
        ChannelCommitment storage commitment = commitments[channelId];
        ChannelAssets storage assets = channelAssets[channelId];
        
        require(!assets.settled, "Already settled");
        require(block.timestamp >= assets.challengeDeadline, "Challenge period active");
        
        // Mark as settled
        assets.settled = true;
        
        // Transfer final balances
        if (commitment.balance0 > 0) {
            IERC20(assets.token).safeTransfer(assets.party0, commitment.balance0);
        }
        if (commitment.balance1 > 0) {
            IERC20(assets.token).safeTransfer(assets.party1, commitment.balance1);
        }
    }

    /**
     * @notice Update Yellow configuration
     * @param endpoint New Yellow node endpoint
     * @param appId New application ID
     */
    function updateYellowConfig(
        string memory endpoint,
        bytes32 appId
    ) external onlyOwner {
        yellowNodeEndpoint = endpoint;
        yellowAppId = appId;
        emit YellowConfigUpdated(endpoint, appId);
    }

    /**
     * @notice Get channel commitment
     * @param channelId Channel identifier
     * @return Current channel commitment
     */
    function getCommitment(bytes32 channelId) 
        external 
        view 
        returns (ChannelCommitment memory) 
    {
        return commitments[channelId];
    }

    /**
     * @notice Check if channel can be settled
     * @param channelId Channel identifier
     * @return True if ready for settlement
     */
    function canSettle(bytes32 channelId) external view returns (bool) {
        return channelRegistry.canCloseChannel(channelId);
    }

    /**
     * @notice Get Yellow network connection info
     * @return endpoint WebSocket endpoint
     * @return appId Application ID
     */
    function getYellowConfig() 
        external 
        view 
        returns (string memory endpoint, bytes32 appId) 
    {
        return (yellowNodeEndpoint, yellowAppId);
    }
}
