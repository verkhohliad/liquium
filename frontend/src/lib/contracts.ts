/**
 * Contract addresses and ABIs for Liquium on Flare Mainnet
 */

// Deployed contract addresses on Flare Mainnet (Chain ID: 14)
// TODO: Replace these with your actual Flare deployment addresses from deploy-flare.ts
export const CONTRACTS = {
  DealPosition: "REPLACE_WITH_FLARE_ADDRESS",
  ChannelRegistry: "REPLACE_WITH_FLARE_ADDRESS",
  MockProtocol: "REPLACE_WITH_FLARE_ADDRESS",
  PriceReader: "REPLACE_WITH_FLARE_ADDRESS",
  DealVault: "REPLACE_WITH_FLARE_ADDRESS",
} as const;

// Note: Yellow Network integration removed
// No longer using: YellowChannel, NitroliteAdapter, RewardDistributor
// Users withdraw rewards directly via DealVault.withdraw(positionId)

// Test USDC address on Flare (deploy your own or use existing)
export const TEST_USDC = "REPLACE_WITH_FLARE_USDC_ADDRESS";

export const CHAIN_ID = 14; // Flare Mainnet

// Minimal ABIs - only the functions we need
export const DealVaultABI = [
  // Read functions
  "function getDeal(uint256 dealId) view returns (tuple(uint256 dealId, address depositToken, uint256 minDeposit, uint256 maxDeposit, uint256 totalDeposited, uint256 startTime, uint256 duration, uint8 status, uint256 expectedYield, bytes32 channelId))",
  "function getUserDeposit(uint256 dealId, address user) view returns (tuple(uint256 amount, address yellowAddress, uint256 rewardShare, bool rewardsClaimed))",
  "function getDealDepositors(uint256 dealId) view returns (address[])",
  "function positionDeals(uint256 positionId) view returns (uint256)",
  "function isDealActive(uint256 dealId) view returns (bool)",

  // Write functions
  "function createDeal(address depositToken, uint256 minDeposit, uint256 maxDeposit, uint256 duration, uint256 expectedYield) returns (uint256)",
  "function deposit(uint256 dealId, uint256 amount) returns (uint256 positionId)",
  "function setUserYellowAddress(uint256 dealId, address yellowAddress)",
  "function lockDeal(uint256 dealId)",
  "function depositToProtocol(uint256 dealId)",
  "function claimRewardsFromProtocol(uint256 dealId) returns (uint256 rewards)",
  "function withdraw(uint256 positionId)",
  "function claimPosition(uint256 positionId)",

  // Events
  "event DealCreated(uint256 indexed dealId, address depositToken, uint256 duration)",
  "event Deposited(uint256 indexed dealId, address indexed depositor, uint256 indexed positionId, uint256 amount)",
  "event DealLocked(uint256 indexed dealId, bytes32 indexed channelId)",
  "event RewardsClaimedFromProtocol(uint256 indexed dealId, address indexed protocol, uint256 rewards)",
] as const;

// RewardDistributorABI removed - Yellow Network integration not used

export const MockProtocolABI = [
  // Read functions
  "function getDeposit(address vault, address token) view returns (tuple(uint256 amount, uint256 depositTime, bool active))",
  "function getRewards(address vault, address token) view returns (uint256)",
  "function getTotalBalance(address vault, address token) view returns (uint256)",

  // Write functions (admin only)
  "function fundProtocol(address token, uint256 amount)",

  // Events
  "event Deposited(address indexed vault, address indexed token, uint256 amount, uint256 timestamp)",
  "event RewardsClaimed(address indexed vault, address indexed token, uint256 rewards, uint256 timestamp)",
] as const;

export const ERC20ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export const DealPositionABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function getPosition(uint256 tokenId) view returns (tuple(uint256 dealId, uint256 depositAmount, uint256 depositTime, bool claimed))",
  "function ownerOf(uint256 tokenId) view returns (address)",
] as const;

// Deal Status enum
export enum DealStatus {
  Active = 0,
  Locked = 1,
  Settling = 2,
  Finalized = 3,
  Cancelled = 4,
}

export const DealStatusLabels: Record<DealStatus, string> = {
  [DealStatus.Active]: "Active",
  [DealStatus.Locked]: "Locked",
  [DealStatus.Settling]: "Settling",
  [DealStatus.Finalized]: "Finalized",
  [DealStatus.Cancelled]: "Cancelled",
};

// Types for contract data
export interface Deal {
  dealId: bigint;
  depositToken: string;
  minDeposit: bigint;
  maxDeposit: bigint;
  totalDeposited: bigint;
  startTime: bigint;
  duration: bigint;
  status: DealStatus;
  expectedYield: bigint;
  channelId: string;
}

export interface UserDeposit {
  amount: bigint;
  yellowAddress: string;
  rewardShare: bigint;
  rewardsClaimed: boolean;
}

export interface Position {
  dealId: bigint;
  depositAmount: bigint;
  depositTime: bigint;
  claimed: boolean;
}

export interface ChannelCommitment {
  channelId: string;
  stateHash: string;
  nonce: bigint;
  balance0: bigint;
  balance1: bigint;
  signature0: string;
  signature1: string;
  timeout: bigint;
}
