import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { base } from 'viem/chains';

// Flare Mainnet
export const flare = defineChain({
  id: 14,
  name: 'Flare',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_FLARE_RPC_URL || 'https://flare-api.flare.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://flare-explorer.flare.network',
    },
  },
  testnet: false,
});

export const config = getDefaultConfig({
  appName: 'Liquium',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'liquium-default-project-id',
  chains: [flare, base],
  ssr: false, // Disable SSR to avoid indexedDB errors in Docker
});
