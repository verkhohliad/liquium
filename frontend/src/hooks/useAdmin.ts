/**
 * Hooks for admin operations (deal management, rewards)
 */

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS, DealVaultABI, RewardDistributorABI, ERC20ABI, TEST_USDC } from "../lib/contracts";

/**
 * Create a new deal
 */
export function useCreateDeal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createDeal = (params: {
    depositToken: `0x${string}`;
    targetToken: `0x${string}`;
    targetChainId: number;
    minDeposit: string; // in token units
    maxDeposit: string; // in token units
    durationDays: number;
    expectedYieldBps: number; // basis points (1000 = 10%)
  }) => {
    const minDepositWei = parseUnits(params.minDeposit, 6); // USDC decimals
    const maxDepositWei = parseUnits(params.maxDeposit, 6);
    const durationSeconds = BigInt(params.durationDays * 24 * 60 * 60);

    writeContract({
      address: CONTRACTS.DealVault,
      abi: DealVaultABI,
      functionName: "createDeal",
      args: [
        params.depositToken,
        params.targetToken,
        BigInt(params.targetChainId),
        minDepositWei,
        maxDepositWei,
        durationSeconds,
        BigInt(params.expectedYieldBps),
      ],
    });
  };

  return { createDeal, hash, isPending: isPending || isConfirming, isSuccess, error };
}

/**
 * Lock a deal (prevents new deposits)
 */
export function useLockDeal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const lockDeal = (dealId: number) => {
    writeContract({
      address: CONTRACTS.DealVault,
      abi: DealVaultABI,
      functionName: "lockDeal",
      args: [BigInt(dealId)],
    });
  };

  return { lockDeal, hash, isPending: isPending || isConfirming, isSuccess, error };
}

/**
 * Deposit deal funds to MockProtocol
 */
export function useDepositToProtocol() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const depositToProtocol = (dealId: number) => {
    writeContract({
      address: CONTRACTS.DealVault,
      abi: DealVaultABI,
      functionName: "depositToProtocol",
      args: [BigInt(dealId)],
    });
  };

  return { depositToProtocol, hash, isPending: isPending || isConfirming, isSuccess, error };
}

/**
 * Claim rewards from MockProtocol
 */
export function useClaimRewards() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimRewards = (dealId: number) => {
    writeContract({
      address: CONTRACTS.DealVault,
      abi: DealVaultABI,
      functionName: "claimRewardsFromProtocol",
      args: [BigInt(dealId)],
    });
  };

  return { claimRewards, hash, isPending: isPending || isConfirming, isSuccess, error };
}

/**
 * Approve RewardDistributor to spend DealVault's tokens
 * NOTE: This must be done BEFORE distributeRewardsToYellow
 */
export function useApproveDistributor() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approveDistributor = (amount: string) => {
    const amountWei = parseUnits(amount, 6); // USDC decimals

    writeContract({
      address: TEST_USDC,
      abi: ERC20ABI,
      functionName: "approve",
      args: [CONTRACTS.RewardDistributor, amountWei],
    });
  };

  return { approveDistributor, hash, isPending: isPending || isConfirming, isSuccess, error };
}

/**
 * Distribute rewards to Yellow Network channels
 */
export function useDistributeRewards() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const distributeRewards = (dealId: number) => {
    writeContract({
      address: CONTRACTS.RewardDistributor,
      abi: RewardDistributorABI,
      functionName: "distributeRewardsToYellow",
      args: [BigInt(dealId)],
    });
  };

  return { distributeRewards, hash, isPending: isPending || isConfirming, isSuccess, error };
}
