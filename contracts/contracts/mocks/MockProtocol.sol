// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title MockProtocol
 * @notice Simple mock lending/staking protocol for testing DealVault integrations
 * @dev Returns 10% simple interest on deposits
 *
 * Features:
 * - Accepts ERC20 deposits from vaults
 * - Calculates 10% simple interest rewards
 * - Allows withdrawal of principal + rewards
 * - Multi-token support
 */
contract MockProtocol is Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice Deposit information per vault per token
    struct Deposit {
        uint256 amount;          // Principal amount deposited
        uint256 depositTime;     // Timestamp of deposit
        bool active;             // Whether deposit is active
    }

    /// @notice Mapping: vault address => token address => Deposit
    mapping(address => mapping(address => Deposit)) public deposits;

    /// @notice Interest rate in basis points (1000 = 10%)
    uint256 public constant INTEREST_RATE_BPS = 1000;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Events
    event Deposited(
        address indexed vault,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event Withdrawn(
        address indexed vault,
        address indexed token,
        uint256 principal,
        uint256 rewards,
        uint256 timestamp
    );

    event RewardsClaimed(
        address indexed vault,
        address indexed token,
        uint256 rewards,
        uint256 timestamp
    );

    /// @notice Custom errors
    error NoActiveDeposit();
    error DepositAlreadyExists();
    error InsufficientBalance();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Deposit tokens into the protocol
     * @param token Token address to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external {
        Deposit storage userDeposit = deposits[msg.sender][token];

        // Check no active deposit exists
        if (userDeposit.active) revert DepositAlreadyExists();

        // Transfer tokens from vault to protocol
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Record deposit
        userDeposit.amount = amount;
        userDeposit.depositTime = block.timestamp;
        userDeposit.active = true;

        emit Deposited(msg.sender, token, amount, block.timestamp);
    }

    /**
     * @notice Get current rewards for a vault's deposit
     * @param vault Vault address
     * @param token Token address
     * @return rewards Calculated rewards (10% of principal)
     */
    function getRewards(address vault, address token)
        public
        view
        returns (uint256 rewards)
    {
        Deposit storage userDeposit = deposits[vault][token];

        if (!userDeposit.active) return 0;

        // Simple 10% interest calculation
        rewards = (userDeposit.amount * INTEREST_RATE_BPS) / BPS_DENOMINATOR;
    }

    /**
     * @notice Get total balance (principal + rewards) for a vault
     * @param vault Vault address
     * @param token Token address
     * @return total Total withdrawable amount
     */
    function getTotalBalance(address vault, address token)
        external
        view
        returns (uint256 total)
    {
        Deposit storage userDeposit = deposits[vault][token];

        if (!userDeposit.active) return 0;

        uint256 rewards = getRewards(vault, token);
        total = userDeposit.amount + rewards;
    }

    /**
     * @notice Claim rewards only (leave principal deposited)
     * @param token Token address
     * @return rewards Amount of rewards claimed
     */
    function claimRewards(address token) external returns (uint256 rewards) {
        Deposit storage userDeposit = deposits[msg.sender][token];

        if (!userDeposit.active) revert NoActiveDeposit();

        // Calculate rewards
        rewards = getRewards(msg.sender, token);

        if (rewards == 0) return 0;

        // Check protocol has sufficient balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < rewards) revert InsufficientBalance();

        // Transfer rewards to vault
        IERC20(token).safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, token, rewards, block.timestamp);
    }

    /**
     * @notice Withdraw principal + rewards and close deposit
     * @param token Token address
     * @param amount Amount to withdraw (0 = withdraw all)
     * @return principal Amount of principal withdrawn
     * @return rewards Amount of rewards withdrawn
     */
    function withdraw(address token, uint256 amount)
        external
        returns (uint256 principal, uint256 rewards)
    {
        Deposit storage userDeposit = deposits[msg.sender][token];

        if (!userDeposit.active) revert NoActiveDeposit();

        // Calculate rewards
        rewards = getRewards(msg.sender, token);

        // Determine withdrawal amount
        if (amount == 0) {
            // Withdraw all: principal + rewards
            principal = userDeposit.amount;
        } else {
            // Withdraw specific amount
            require(amount <= userDeposit.amount, "Amount exceeds deposit");
            principal = amount;
        }

        uint256 totalWithdrawal = principal + rewards;

        // Check protocol has sufficient balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < totalWithdrawal) revert InsufficientBalance();

        // Update deposit
        if (principal == userDeposit.amount) {
            // Full withdrawal - close deposit
            delete deposits[msg.sender][token];
        } else {
            // Partial withdrawal - reduce principal
            userDeposit.amount -= principal;
        }

        // Transfer tokens back to vault
        IERC20(token).safeTransfer(msg.sender, totalWithdrawal);

        emit Withdrawn(msg.sender, token, principal, rewards, block.timestamp);
    }

    /**
     * @notice Get deposit information
     * @param vault Vault address
     * @param token Token address
     * @return Deposit struct
     */
    function getDeposit(address vault, address token)
        external
        view
        returns (Deposit memory)
    {
        return deposits[vault][token];
    }

    /**
     * @notice Check if vault has active deposit
     * @param vault Vault address
     * @param token Token address
     * @return True if active deposit exists
     */
    function hasActiveDeposit(address vault, address token)
        external
        view
        returns (bool)
    {
        return deposits[vault][token].active;
    }

    /**
     * @notice Emergency function to fund protocol with tokens
     * @dev Used to ensure protocol has enough tokens to pay rewards
     * @param token Token address
     * @param amount Amount to fund
     */
    function fundProtocol(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Emergency withdraw function (owner only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
