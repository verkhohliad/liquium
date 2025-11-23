/**
 * Hook for depositing into deals
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS, DealVaultABI, ERC20ABI, TEST_USDC } from "../lib/contracts";

/**
 * Check USDC allowance for DealVault
 */
export function useUSDCAllowance(userAddress?: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: TEST_USDC,
    abi: ERC20ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, CONTRACTS.DealVault] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    allowance: data as bigint | undefined,
    refetch,
  };
}

/**
 * Get USDC balance
 */
export function useUSDCBalance(userAddress?: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: TEST_USDC,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    balance: data as bigint | undefined,
    refetch,
  };
}

/**
 * Approve USDC for DealVault
 */
export function useApproveUSDC() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = (amount: string) => {
    // Parse amount to wei (USDC has 6 decimals)
    const amountWei = parseUnits(amount, 6);

    writeContract({
      address: TEST_USDC,
      abi: ERC20ABI,
      functionName: "approve",
      args: [CONTRACTS.DealVault, amountWei],
    });
  };

  return {
    approve,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Deposit into a deal
 */
export function useDeposit() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = (dealId: number, amount: string) => {
    // Parse amount to wei (USDC has 6 decimals)
    const amountWei = parseUnits(amount, 6);

    writeContract({
      address: CONTRACTS.DealVault,
      abi: DealVaultABI,
      functionName: "deposit",
      args: [BigInt(dealId), amountWei],
    });
  };

  return {
    deposit,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Set user's Yellow Network address
 */
export function useSetYellowAddress() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const setYellowAddress = (dealId: number, yellowAddress: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.DealVault,
      abi: DealVaultABI,
      functionName: "setUserYellowAddress",
      args: [BigInt(dealId), yellowAddress],
    });
  };

  return {
    setYellowAddress,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}
