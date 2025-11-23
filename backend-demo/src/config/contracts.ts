// Contract addresses for Flare Mainnet
// TODO: Replace these with your actual Flare deployment addresses from deploy-flare.ts

export const CONTRACTS = {
  DEAL_POSITION: process.env.DEAL_POSITION_ADDRESS || 'REPLACE_WITH_FLARE_ADDRESS',
  CHANNEL_REGISTRY: process.env.CHANNEL_REGISTRY_ADDRESS || 'REPLACE_WITH_FLARE_ADDRESS',
  MOCK_PROTOCOL: process.env.MOCK_PROTOCOL_ADDRESS || 'REPLACE_WITH_FLARE_ADDRESS',
  PRICE_READER: process.env.PRICE_READER_ADDRESS || 'REPLACE_WITH_FLARE_ADDRESS',
  DEAL_VAULT: process.env.DEAL_VAULT_ADDRESS || 'REPLACE_WITH_FLARE_ADDRESS',
} as const

// Note: Yellow Network integration removed
// No longer using: YellowChannel, NitroliteAdapter, YellowRewardDistributor

export const FLARE_CHAIN_ID = 14

// Flare Mainnet RPC
export const RPC_URL = process.env.RPC_URL || 'https://rpc.ankr.com/flare'
