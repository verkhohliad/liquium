/**
 * Hook for fetching and managing deals
 */

import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, DealVaultABI, type Deal } from "../lib/contracts";

/**
 * Fetch a single deal by ID
 */
export function useDeal(dealId: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.DealVault,
    abi: DealVaultABI,
    functionName: "getDeal",
    args: [BigInt(dealId)],
  });

  return {
    deal: data as Deal | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetch multiple deals by IDs
 * NOTE: In production, this should come from backend API with indexed data
 * For demo, we'll fetch deals 1-5 manually
 */
export function useDeals(dealIds: number[] = [1, 2, 3, 4, 5]) {
  const contracts = dealIds.map((id) => ({
    address: CONTRACTS.DealVault,
    abi: DealVaultABI,
    functionName: "getDeal",
    args: [BigInt(id)],
  }));

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
  });

  // Filter out empty deals (dealId === 0)
  const deals = (data
    ?.map((result, index) => {
      if (result.status === "success" && result.result) {
        const deal = result.result as Deal;
        return deal.dealId !== 0n ? deal : null;
      }
      return null;
    })
    .filter(Boolean) as Deal[]) || [];

  return {
    deals,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Check if deal is active
 */
export function useIsDealActive(dealId: number) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.DealVault,
    abi: DealVaultABI,
    functionName: "isDealActive",
    args: [BigInt(dealId)],
  });

  return {
    isActive: data as boolean | undefined,
    isLoading,
  };
}

/**
 * Get user's deposit in a deal
 */
export function useUserDeposit(dealId: number, userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.DealVault,
    abi: DealVaultABI,
    functionName: "getUserDeposit",
    args: userAddress ? [BigInt(dealId), userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    userDeposit: data,
    isLoading,
    refetch,
  };
}

/**
 * Get all depositors for a deal
 */
export function useDealDepositors(dealId: number) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.DealVault,
    abi: DealVaultABI,
    functionName: "getDealDepositors",
    args: [BigInt(dealId)],
  });

  return {
    depositors: (data as `0x${string}`[]) || [],
    isLoading,
    refetch,
  };
}
