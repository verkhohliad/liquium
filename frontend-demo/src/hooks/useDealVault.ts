import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS } from '../lib/wagmi'
import type { Deal, UserDeposit } from '../types/contracts'
import DealVaultABI from '../lib/contracts/DealVault.json'

export function useDealVault() {
  const { writeContractAsync } = useWriteContract()

  // Read a single deal
  const useDeal = (dealId: number) => {
    return useReadContract({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'getDeal',
      args: [BigInt(dealId)],
    })
  }

  // Get user deposit for a deal
  const useUserDeposit = (dealId: number, userAddress: `0x${string}` | undefined) => {
    return useReadContract({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'getUserDeposit',
      args: [BigInt(dealId), userAddress!],
      query: {
        enabled: !!userAddress,
      },
    })
  }

  // Get all depositors for a deal
  const useDealDepositors = (dealId: number) => {
    return useReadContract({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'getDealDepositors',
      args: [BigInt(dealId)],
    })
  }

  // Create a new deal (owner only)
  const createDeal = async (params: {
    depositToken: `0x${string}`
    minDeposit: bigint
    maxDeposit: bigint
    duration: number
    expectedYield: number
  }) => {
    return writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'createDeal',
      args: [
        params.depositToken,
        params.minDeposit,
        params.maxDeposit,
        BigInt(params.duration),
        BigInt(params.expectedYield),
      ],
    })
  }

  // Deposit into a deal
  const deposit = async (dealId: number, amount: bigint) => {
    return writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'deposit',
      args: [BigInt(dealId), amount],
    })
  }

  // Set user's Yellow Network address
  const setUserYellowAddress = async (dealId: number, yellowAddress: `0x${string}`) => {
    return writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'setUserYellowAddress',
      args: [BigInt(dealId), yellowAddress],
    })
  }

  // Admin functions
  const lockDeal = async (dealId: number) => {
    return writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'lockDeal',
      args: [BigInt(dealId)],
    })
  }

  const depositToProtocol = async (dealId: number) => {
    return writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'depositToProtocol',
      args: [BigInt(dealId)],
    })
  }

  const claimRewardsFromProtocol = async (dealId: number) => {
    return writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'claimRewardsFromProtocol',
      args: [BigInt(dealId)],
    })
  }

  return {
    useDeal,
    useUserDeposit,
    useDealDepositors,
    createDeal,
    deposit,
    setUserYellowAddress,
    lockDeal,
    depositToProtocol,
    claimRewardsFromProtocol,
  }
}

// Hook to wait for transaction confirmation
export function useTransactionConfirmation(hash: `0x${string}` | undefined) {
  return useWaitForTransactionReceipt({
    hash,
  })
}
