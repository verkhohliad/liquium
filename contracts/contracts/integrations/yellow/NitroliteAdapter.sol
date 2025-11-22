// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../../core/DealVault.sol";
import "./YellowChannel.sol";

/**
 * @title NitroliteAdapter
 * @notice Bridge between Liquium deals and Yellow/Nitrolite state channels
 * @dev Adapts DealVault operations to YellowChannel ERC-7824 format
 * 
 * Architecture:
 * DealVault → NitroliteAdapter → YellowChannel → Nitrolite SDK
 * 
 * Key Responsibilities:
 * - Map deals to channels
 * - Transform deal states to channel states
 * - Generate settlement proofs
 * - Coordinate lifecycle transitions
 */
contract NitroliteAdapter is Ownable2Step {
    /// @notice Deal vault reference
    DealVault public immutable dealVault;

    /// @notice Yellow channel reference
    YellowChannel public immutable yellowChannel;

    /// @notice Mapping from deal ID to channel ID
    mapping(uint256 => bytes32) public dealToChannel;

    /// @notice Mapping from channel ID to deal ID
    mapping(bytes32 => uint256) public channelToDeal;

    /// @notice Channel state data
    struct ChannelState {
        bytes32 channelId;
        uint256 dealId;
        uint256 nonce;
        bytes32 latestStateHash;
        bool active;
    }

    /// @notice Mapping from channel ID to state
    mapping(bytes32 => ChannelState) public channelStates;

    /// @notice Events
    event ChannelCreatedForDeal(
        uint256 indexed dealId,
        bytes32 indexed channelId,
        address party0,
        address party1
    );
    event StateUpdateProcessed(
        bytes32 indexed channelId,
        uint256 nonce,
        bytes32 stateHash
    );
    event SettlementProofGenerated(
        bytes32 indexed channelId,
        uint256 indexed dealId,
        bytes proof
    );
    event ChannelSettled(bytes32 indexed channelId, uint256 indexed dealId);

    /// @notice Custom errors
    error ChannelAlreadyExists();
    error ChannelNotFound();
    error InvalidDeal();
    error InvalidState();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param _dealVault Address of DealVault contract
     * @param _yellowChannel Address of YellowChannel contract
     */
    constructor(
        address initialOwner,
        address _dealVault,
        address _yellowChannel
    ) Ownable(initialOwner) {
        dealVault = DealVault(_dealVault);
        yellowChannel = YellowChannel(_yellowChannel);
    }

    /**
     * @notice Create channel for a deal
     * @param dealId Deal identifier
     * @param party0 First party address (dealer)
     * @param party1 Second party address (LP)
     * @param initialBalance0 Initial balance for party0
     * @param initialBalance1 Initial balance for party1
     * @return channelId Created channel identifier
     */
    function createChannelForDeal(
        uint256 dealId,
        address party0,
        address party1,
        uint256 initialBalance0,
        uint256 initialBalance1
    ) external onlyOwner returns (bytes32 channelId) {
        // Check deal exists and is valid
        DealVault.Deal memory deal = dealVault.getDeal(dealId);
        if (deal.dealId == 0) revert InvalidDeal();
        
        // Generate unique channel ID
        channelId = keccak256(
            abi.encodePacked(
                dealId,
                party0,
                party1,
                block.timestamp
            )
        );

        // Check no existing channel
        if (dealToChannel[dealId] != bytes32(0)) revert ChannelAlreadyExists();

        // Open Yellow channel
        yellowChannel.openYellowChannel(
            channelId,
            party0,
            party1,
            initialBalance0,
            initialBalance1,
            dealId
        );

        // Create bidirectional mapping
        dealToChannel[dealId] = channelId;
        channelToDeal[channelId] = dealId;

        // Initialize channel state
        channelStates[channelId] = ChannelState({
            channelId: channelId,
            dealId: dealId,
            nonce: 0,
            latestStateHash: keccak256(
                abi.encodePacked(initialBalance0, initialBalance1, uint256(0))
            ),
            active: true
        });

        // Link channel to deal in vault
        dealVault.linkChannel(dealId, channelId);

        emit ChannelCreatedForDeal(dealId, channelId, party0, party1);
    }

    /**
     * @notice Process state update from Nitrolite
     * @param channelId Channel identifier
     * @param newStateHash New state hash
     * @param newNonce New nonce
     * @param balance0 New balance for party0
     * @param balance1 New balance for party1
     * @param signature0 Signature from party0
     * @param signature1 Signature from party1
     */
    function processStateUpdate(
        bytes32 channelId,
        bytes32 newStateHash,
        uint256 newNonce,
        uint256 balance0,
        uint256 balance1,
        bytes calldata signature0,
        bytes calldata signature1
    ) external onlyOwner {
        ChannelState storage state = channelStates[channelId];
        
        if (!state.active) revert ChannelNotFound();
        if (newNonce <= state.nonce) revert InvalidState();

        // Commit state to Yellow channel
        yellowChannel.commitState(
            channelId,
            newStateHash,
            newNonce,
            balance0,
            balance1,
            signature0,
            signature1
        );

        // Update local state
        state.nonce = newNonce;
        state.latestStateHash = newStateHash;

        emit StateUpdateProcessed(channelId, newNonce, newStateHash);
    }

    /**
     * @notice Generate settlement proof for deal
     * @param channelId Channel identifier
     * @return proof Settlement proof bytes
     */
    function generateSettlementProof(bytes32 channelId)
        public
        view
        returns (bytes memory proof)
    {
        ChannelState storage state = channelStates[channelId];
        if (!state.active) revert ChannelNotFound();

        // Get channel commitment
        YellowChannel.ChannelCommitment memory commitment = 
            yellowChannel.getCommitment(channelId);

        // Encode proof with all necessary data
        proof = abi.encode(
            channelId,
            state.dealId,
            commitment.nonce,
            commitment.stateHash,
            commitment.balance0,
            commitment.balance1,
            commitment.signature0,
            commitment.signature1
        );
    }

    /**
     * @notice Process settlement for deal with channel proof
     * @param dealId Deal identifier
     */
    function processSettlement(uint256 dealId) external onlyOwner {
        bytes32 channelId = dealToChannel[dealId];
        if (channelId == bytes32(0)) revert ChannelNotFound();

        ChannelState storage state = channelStates[channelId];
        if (!state.active) revert InvalidState();

        // Generate settlement proof
        bytes memory proof = this.generateSettlementProof(channelId);

        // Settle channel in Yellow
        yellowChannel.settleChannel(channelId);

        // Settle deal in vault with proof
        dealVault.settleDeal(dealId, proof);

        // Mark channel as inactive
        state.active = false;

        emit ChannelSettled(channelId, dealId);
    }

    /**
     * @notice Get channel ID for deal
     * @param dealId Deal identifier
     * @return channelId Associated channel ID
     */
    function getChannelForDeal(uint256 dealId) 
        external 
        view 
        returns (bytes32 channelId) 
    {
        return dealToChannel[dealId];
    }

    /**
     * @notice Get deal ID for channel
     * @param channelId Channel identifier
     * @return dealId Associated deal ID
     */
    function getDealForChannel(bytes32 channelId) 
        external 
        view 
        returns (uint256 dealId) 
    {
        return channelToDeal[channelId];
    }

    /**
     * @notice Get channel state
     * @param channelId Channel identifier
     * @return Channel state data
     */
    function getChannelState(bytes32 channelId) 
        external 
        view 
        returns (ChannelState memory) 
    {
        return channelStates[channelId];
    }

    /**
     * @notice Check if channel is active
     * @param channelId Channel identifier
     * @return True if channel is active
     */
    function isChannelActive(bytes32 channelId) 
        external 
        view 
        returns (bool) 
    {
        return channelStates[channelId].active;
    }
}
