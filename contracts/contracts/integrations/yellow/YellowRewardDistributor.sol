// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../core/DealVault.sol";
import "./YellowChannel.sol";

/**
 * @title YellowRewardDistributor
 * @notice Distributes deal rewards to users via Yellow Network channels
 * @dev Creates individual Yellow channels for each user with their reward allocation
 *
 * Architecture:
 * - DealVault claims rewards from protocol
 * - YellowRewardDistributor creates channels for each user
 * - Each channel allocates (0, userReward) to (vaultAddress, userYellowAddress)
 * - Users can trade their rewards on Yellow Network off-chain
 * - Final settlement returns remaining balance to users
 */
contract YellowRewardDistributor is Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice DealVault reference
    DealVault public immutable dealVault;

    /// @notice YellowChannel reference
    YellowChannel public immutable yellowChannel;

    /// @notice Mapping from deal ID to user to channel ID
    mapping(uint256 => mapping(address => bytes32)) public userRewardChannels;

    /// @notice Mapping from channel ID to deal ID
    mapping(bytes32 => uint256) public channelDeals;

    /// @notice Mapping to track if rewards were distributed for a deal
    mapping(uint256 => bool) public rewardsDistributed;

    /// @notice Events
    event RewardChannelCreated(
        uint256 indexed dealId,
        address indexed user,
        address indexed yellowAddress,
        bytes32 channelId,
        uint256 rewardAmount
    );

    event RewardsDistributed(
        uint256 indexed dealId,
        uint256 totalRewards,
        uint256 userCount,
        uint256 channelsCreated
    );

    event RewardChannelSettled(
        bytes32 indexed channelId,
        uint256 indexed dealId,
        address indexed user,
        uint256 finalBalance
    );

    /// @notice Custom errors
    error InvalidDeal();
    error RewardsAlreadyDistributed();
    error NoRewardsForUser();
    error ChannelAlreadyExists();
    error InsufficientFunds();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param _dealVault DealVault contract address
     * @param _yellowChannel YellowChannel contract address
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
     * @notice Distribute rewards to users via Yellow channels
     * @param dealId Deal identifier
     * @dev Creates a Yellow channel for each user with their proportional reward
     */
    function distributeRewardsToYellow(uint256 dealId) external onlyOwner {
        // Check rewards haven't been distributed yet
        if (rewardsDistributed[dealId]) revert RewardsAlreadyDistributed();

        // Get deal information
        DealVault.Deal memory deal = dealVault.getDeal(dealId);
        if (deal.dealId == 0) revert InvalidDeal();

        // Get all depositors
        address[] memory depositors = dealVault.getDealDepositors(dealId);
        require(depositors.length > 0, "No depositors");

        uint256 channelsCreated = 0;
        uint256 totalRewardsDistributed = 0;

        // Create channel for each user with their reward allocation
        for (uint256 i = 0; i < depositors.length; i++) {
            address user = depositors[i];
            DealVault.UserDeposit memory userDep = dealVault.getUserDeposit(dealId, user);

            // Skip if no rewards
            if (userDep.rewardShare == 0) continue;

            // Check channel doesn't already exist
            if (userRewardChannels[dealId][user] != bytes32(0)) {
                continue; // Skip if already created
            }

            // Generate unique channel ID
            bytes32 channelId = keccak256(
                abi.encodePacked(
                    "reward",
                    dealId,
                    user,
                    userDep.yellowAddress,
                    block.timestamp,
                    i
                )
            );

            // Open Yellow channel with reward allocation
            // Party0 = DealVault (balance 0)
            // Party1 = User's Yellow address (balance = reward)
            yellowChannel.openYellowChannel(
                channelId,
                address(dealVault),
                userDep.yellowAddress,
                0, // Vault has 0 balance in channel
                userDep.rewardShare, // User gets full reward
                dealId
            );

            // Deposit reward tokens to the channel
            // Note: DealVault must approve this contract first
            IERC20(deal.depositToken).safeTransferFrom(
                address(dealVault),
                address(yellowChannel),
                userDep.rewardShare
            );

            // Record channel mapping
            userRewardChannels[dealId][user] = channelId;
            channelDeals[channelId] = dealId;

            channelsCreated++;
            totalRewardsDistributed += userDep.rewardShare;

            emit RewardChannelCreated(
                dealId,
                user,
                userDep.yellowAddress,
                channelId,
                userDep.rewardShare
            );
        }

        // Mark as distributed
        rewardsDistributed[dealId] = true;

        emit RewardsDistributed(dealId, totalRewardsDistributed, depositors.length, channelsCreated);
    }

    /**
     * @notice Create individual reward channel for a specific user
     * @param dealId Deal identifier
     * @param user User address
     * @return channelId Created channel ID
     */
    function createRewardChannelForUser(uint256 dealId, address user)
        external
        onlyOwner
        returns (bytes32 channelId)
    {
        // Get deal and user deposit info
        DealVault.Deal memory deal = dealVault.getDeal(dealId);
        if (deal.dealId == 0) revert InvalidDeal();

        DealVault.UserDeposit memory userDep = dealVault.getUserDeposit(dealId, user);
        if (userDep.rewardShare == 0) revert NoRewardsForUser();

        // Check channel doesn't exist
        if (userRewardChannels[dealId][user] != bytes32(0)) {
            revert ChannelAlreadyExists();
        }

        // Generate channel ID
        channelId = keccak256(
            abi.encodePacked(
                "reward",
                dealId,
                user,
                userDep.yellowAddress,
                block.timestamp
            )
        );

        // Open Yellow channel
        yellowChannel.openYellowChannel(
            channelId,
            address(dealVault),
            userDep.yellowAddress,
            0,
            userDep.rewardShare,
            dealId
        );

        // Transfer reward tokens to channel
        IERC20(deal.depositToken).safeTransferFrom(
            address(dealVault),
            address(yellowChannel),
            userDep.rewardShare
        );

        // Record mapping
        userRewardChannels[dealId][user] = channelId;
        channelDeals[channelId] = dealId;

        emit RewardChannelCreated(
            dealId,
            user,
            userDep.yellowAddress,
            channelId,
            userDep.rewardShare
        );
    }

    /**
     * @notice Settle reward channel and return remaining funds to user
     * @param dealId Deal identifier
     * @param user User address
     */
    function settleRewardChannel(uint256 dealId, address user) external {
        bytes32 channelId = userRewardChannels[dealId][user];
        require(channelId != bytes32(0), "Channel not found");

        // Settle the Yellow channel
        yellowChannel.settleChannel(channelId);

        // Get final balance
        YellowChannel.ChannelCommitment memory commitment = yellowChannel.getCommitment(channelId);

        emit RewardChannelSettled(channelId, dealId, user, commitment.balance1);
    }

    /**
     * @notice Get user's reward channel ID
     * @param dealId Deal identifier
     * @param user User address
     * @return channelId Channel ID (bytes32(0) if not created)
     */
    function getUserRewardChannel(uint256 dealId, address user)
        external
        view
        returns (bytes32 channelId)
    {
        return userRewardChannels[dealId][user];
    }

    /**
     * @notice Get deal ID for a reward channel
     * @param channelId Channel identifier
     * @return dealId Deal ID
     */
    function getChannelDeal(bytes32 channelId)
        external
        view
        returns (uint256 dealId)
    {
        return channelDeals[channelId];
    }

    /**
     * @notice Check if rewards have been distributed for a deal
     * @param dealId Deal identifier
     * @return True if distributed
     */
    function areRewardsDistributed(uint256 dealId)
        external
        view
        returns (bool)
    {
        return rewardsDistributed[dealId];
    }

    /**
     * @notice Get reward channel information for a user
     * @param dealId Deal identifier
     * @param user User address
     * @return channelId Channel ID
     * @return commitment Channel commitment data
     */
    function getUserRewardChannelInfo(uint256 dealId, address user)
        external
        view
        returns (
            bytes32 channelId,
            YellowChannel.ChannelCommitment memory commitment
        )
    {
        channelId = userRewardChannels[dealId][user];
        if (channelId != bytes32(0)) {
            commitment = yellowChannel.getCommitment(channelId);
        }
    }
}
