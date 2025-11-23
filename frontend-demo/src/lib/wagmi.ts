import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { flare } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Liquium',
  projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [flare],
  ssr: false,
})

// Contract addresses for Flare Mainnet
// TODO: Replace these with your actual Flare deployment addresses from deploy-flare.ts
export const CONTRACTS = {
  DEAL_POSITION: 'REPLACE_WITH_FLARE_ADDRESS' as `0x${string}`,
  CHANNEL_REGISTRY: 'REPLACE_WITH_FLARE_ADDRESS' as `0x${string}`,
  MOCK_PROTOCOL: 'REPLACE_WITH_FLARE_ADDRESS' as `0x${string}`,
  PRICE_READER: 'REPLACE_WITH_FLARE_ADDRESS' as `0x${string}`,
  DEAL_VAULT: 'REPLACE_WITH_FLARE_ADDRESS' as `0x${string}`,
} as const

// Note: Yellow Network integration removed (YellowChannel, NitroliteAdapter, YellowRewardDistributor)
// Users withdraw rewards directly via DealVault.withdraw(positionId)

export const FLARE_CHAIN_ID = 14
