export enum DealStatus {
  Active = 0,
  Locked = 1,
  Settling = 2,
  Finalized = 3,
  Cancelled = 4,
}

export interface Deal {
  dealId: bigint
  depositToken: `0x${string}`
  minDeposit: bigint
  maxDeposit: bigint
  totalDeposited: bigint
  startTime: bigint
  duration: bigint
  status: DealStatus
  expectedYield: bigint
  channelId: `0x${string}`
}

export interface UserDeposit {
  amount: bigint
  yellowAddress: `0x${string}`
  rewardShare: bigint
  rewardsClaimed: boolean
}

export interface Position {
  dealId: bigint
  depositAmount: bigint
  depositTime: bigint
  claimed: boolean
}

export interface DealCardProps {
  deal: Deal
  dealId: number
}

export interface DepositFormProps {
  dealId: number
  deal: Deal
}

export interface RewardInfo {
  userAddress: `0x${string}`
  rewardAmount: bigint
  yellowChannelId: string | null
  claimed: boolean
}
