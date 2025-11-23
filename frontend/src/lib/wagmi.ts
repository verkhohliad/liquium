/**
 * Wagmi configuration for wallet connection
 */

import { createConfig, http } from "wagmi";
import { flare } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// WalletConnect Project ID - get from https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const config = createConfig({
  chains: [flare],
  connectors: [
    injected(), // MetaMask, Rainbow, etc.
    walletConnect({ projectId }),
    coinbaseWallet({
      appName: "Liquium",
      appLogoUrl: "https://liquium.app/logo.png",
    }),
  ],
  transports: {
    [flare.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
