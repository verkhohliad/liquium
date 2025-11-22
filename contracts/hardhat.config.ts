import type { HardhatUserConfig } from "hardhat/config";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: "../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
    
    coston2: {
      type: "http",
      chainId: 114,
      url: process.env.FLARE_RPC_URL || "https://coston2-api.flare.network/ext/bc/C/rpc",
      accounts: process.env.PRIVATE_KEY_DEPLOYER ? [process.env.PRIVATE_KEY_DEPLOYER] : [],
      gasPrice: "auto",
    },
  },
  
  etherscan: {
    apiKey: {
      coston2: process.env.FLARE_EXPLORER_API_KEY || "verifyContract",
    },
    customChains: [
      {
        network: "coston2",
        chainId: 114,
        urls: {
          apiURL: "https://coston2-explorer.flare.network/api",
          browserURL: "https://coston2-explorer.flare.network",
        },
      },
    ],
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
