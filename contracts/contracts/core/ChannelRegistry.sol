// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ChannelRegistry
 * @notice Registry for managing state channels used in deal settlements
 * @dev Integrates with Yellow/Nitrolite protocol for off-chain state management
 */
contract ChannelRegistry is Ownable2Step {
    /// @notice Channel state
    enum ChannelState {
        Nonexistent,
        Open,
        Disputed,
        Finalized,
        Closed
    }

    /// @notice Channel data
    struct Channel {
        bytes32 channelId;          // Unique channel identifier
        address dealer;             // Deal vault address
        address counterparty;       // Remote chain or external party
        uint256 dealId;             // Associated deal ID
        uint256 depositAmount;      // Amount locked in channel
        uint256 openedAt;           // Timestamp when channel opened
        uint256 finalizedAt;        // Timestamp when finalized
        ChannelState state;         // Current channel state
        bytes32 stateRoot;          // Latest state root hash
        uint256 nonce;              // State update nonce
    }

    /// @notice Mapping from channel ID to channel data
    mapping(bytes32 => Channel) public channels;

    /// @notice Mapping from deal ID to list of channel IDs
    mapping(uint256 => bytes32[]) public dealChannels;

    /// @notice Authorized operators that can manage channels
    mapping(address => bool) public operators;

    /// @notice Challenge period in seconds
    uint256 public challengePeriod = 24 hours;

    /// @notice Events
    event ChannelOpened(
        bytes32 indexed channelId,
        address indexed dealer,
        uint256 indexed dealId,
        uint256 depositAmount
    );
    event ChannelStateUpdated(
        bytes32 indexed channelId,
        bytes32 stateRoot,
        uint256 nonce
    );
    event ChannelDisputed(
        bytes32 indexed channelId,
        address indexed challenger
    );
    event ChannelFinalized(
        bytes32 indexed channelId,
        bytes32 finalStateRoot
    );
    event ChannelClosed(bytes32 indexed channelId);
    event OperatorSet(address indexed operator, bool authorized);
    event ChallengePeriodUpdated(uint256 newPeriod);

    /// @notice Custom errors
    error UnauthorizedOperator();
    error ChannelAlreadyExists();
    error ChannelNotFound();
    error InvalidChannelState();
    error ChallengePeriodNotElapsed();
    error InvalidStateTransition();
    error InvalidNonce();

    /// @notice Modifier to check if caller is authorized operator
    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedOperator();
        }
        _;
    }

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        operators[initialOwner] = true;
    }

    /**
     * @notice Open a new state channel
     * @param channelId Unique channel identifier
     * @param dealer Deal vault address
     * @param counterparty Remote party address
     * @param dealId Associated deal ID
     * @param depositAmount Amount to lock in channel
     */
    function openChannel(
        bytes32 channelId,
        address dealer,
        address counterparty,
        uint256 dealId,
        uint256 depositAmount
    ) external onlyOperator {
        if (channels[channelId].state != ChannelState.Nonexistent) {
            revert ChannelAlreadyExists();
        }

        channels[channelId] = Channel({
            channelId: channelId,
            dealer: dealer,
            counterparty: counterparty,
            dealId: dealId,
            depositAmount: depositAmount,
            openedAt: block.timestamp,
            finalizedAt: 0,
            state: ChannelState.Open,
            stateRoot: bytes32(0),
            nonce: 0
        });

        dealChannels[dealId].push(channelId);

        emit ChannelOpened(channelId, dealer, dealId, depositAmount);
    }

    /**
     * @notice Update channel state
     * @param channelId Channel identifier
     * @param stateRoot New state root hash
     * @param nonce State update nonce
     */
    function updateChannelState(
        bytes32 channelId,
        bytes32 stateRoot,
        uint256 nonce
    ) external onlyOperator {
        Channel storage channel = channels[channelId];
        
        if (channel.state == ChannelState.Nonexistent) {
            revert ChannelNotFound();
        }
        if (channel.state != ChannelState.Open) {
            revert InvalidChannelState();
        }
        if (nonce <= channel.nonce) {
            revert InvalidNonce();
        }

        channel.stateRoot = stateRoot;
        channel.nonce = nonce;

        emit ChannelStateUpdated(channelId, stateRoot, nonce);
    }

    /**
     * @notice Initiate dispute for a channel
     * @param channelId Channel identifier
     */
    function disputeChannel(bytes32 channelId) external {
        Channel storage channel = channels[channelId];
        
        if (channel.state == ChannelState.Nonexistent) {
            revert ChannelNotFound();
        }
        if (channel.state != ChannelState.Open) {
            revert InvalidChannelState();
        }

        channel.state = ChannelState.Disputed;

        emit ChannelDisputed(channelId, msg.sender);
    }

    /**
     * @notice Finalize channel state (start challenge period)
     * @param channelId Channel identifier
     * @param finalStateRoot Final state root hash
     */
    function finalizeChannel(
        bytes32 channelId,
        bytes32 finalStateRoot
    ) external onlyOperator {
        Channel storage channel = channels[channelId];
        
        if (channel.state == ChannelState.Nonexistent) {
            revert ChannelNotFound();
        }
        if (channel.state != ChannelState.Open && channel.state != ChannelState.Disputed) {
            revert InvalidChannelState();
        }

        channel.state = ChannelState.Finalized;
        channel.stateRoot = finalStateRoot;
        channel.finalizedAt = block.timestamp;

        emit ChannelFinalized(channelId, finalStateRoot);
    }

    /**
     * @notice Close channel after challenge period
     * @param channelId Channel identifier
     */
    function closeChannel(bytes32 channelId) external onlyOperator {
        Channel storage channel = channels[channelId];
        
        if (channel.state == ChannelState.Nonexistent) {
            revert ChannelNotFound();
        }
        if (channel.state != ChannelState.Finalized) {
            revert InvalidChannelState();
        }
        if (block.timestamp < channel.finalizedAt + challengePeriod) {
            revert ChallengePeriodNotElapsed();
        }

        channel.state = ChannelState.Closed;

        emit ChannelClosed(channelId);
    }

    /**
     * @notice Set operator authorization
     * @param operator Address of the operator
     * @param authorized Whether to authorize or revoke
     */
    function setOperator(address operator, bool authorized) external onlyOwner {
        operators[operator] = authorized;
        emit OperatorSet(operator, authorized);
    }

    /**
     * @notice Update challenge period
     * @param newPeriod New challenge period in seconds
     */
    function setChallengePeriod(uint256 newPeriod) external onlyOwner {
        challengePeriod = newPeriod;
        emit ChallengePeriodUpdated(newPeriod);
    }

    /**
     * @notice Get channel data
     * @param channelId Channel identifier
     * @return Channel data
     */
    function getChannel(bytes32 channelId) external view returns (Channel memory) {
        return channels[channelId];
    }

    /**
     * @notice Get all channels for a deal
     * @param dealId Deal identifier
     * @return Array of channel IDs
     */
    function getDealChannels(uint256 dealId) external view returns (bytes32[] memory) {
        return dealChannels[dealId];
    }

    /**
     * @notice Check if channel can be closed
     * @param channelId Channel identifier
     * @return True if channel can be closed
     */
    function canCloseChannel(bytes32 channelId) external view returns (bool) {
        Channel storage channel = channels[channelId];
        return channel.state == ChannelState.Finalized &&
               block.timestamp >= channel.finalizedAt + challengePeriod;
    }
}
