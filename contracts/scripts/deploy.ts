import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
  console.log("🚀 Deploying Liquium contracts to Flare Coston2...\n");

  // FTSO Registry on Coston2
  const FTSO_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
  
  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("📍 Deploying from:", deployer.account.address);
  console.log("🔗 Network:", hre.network.name);
  console.log();

  // Deploy DealFactory (which deploys all core contracts)
  console.log("📦 Deploying DealFactory...");
  const factory = await hre.viem.deployContract("DealFactory", [
    deployer.account.address,  // initialOwner
    FTSO_REGISTRY,             // ftsoRegistry
    deployer.account.address,  // defaultFeeRecipient
  ]);

  console.log("✅ DealFactory deployed at:", factory.address);
  console.log();

  // Get core contract addresses
  console.log("🔍 Fetching core contract addresses...");
  const [positionNFT, channelRegistry, priceReader] = await factory.read.getCoreContracts();

  console.log("📋 Core Contracts Deployed:");
  console.log("  - DealFactory:       ", factory.address);
  console.log("  - DealPosition (NFT):", positionNFT);
  console.log("  - ChannelRegistry:   ", channelRegistry);
  console.log("  - FlarePriceReader:  ", priceReader);
  console.log();

  // Deploy first vault
  console.log("🏦 Deploying first DealVault...");
  const deployVaultTx = await factory.write.deployVault([
    "0x0000000000000000000000000000000000000000", // Use default fee recipient
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployVaultTx });
  
  // Get vault address from event
  const vaultCount = await factory.read.getVaultCount();
  const vaultAddress = await factory.read.getVault([vaultCount - 1n]);

  console.log("✅ DealVault deployed at:", vaultAddress);
  console.log();

  // Summary
  console.log("🎉 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Factory:        ${factory.address}`);
  console.log(`Position NFT:   ${positionNFT}`);
  console.log(`Channel Reg:    ${channelRegistry}`);
  console.log(`Price Reader:   ${priceReader}`);
  console.log(`First Vault:    ${vaultAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();
  console.log("💾 Save these addresses to your .env file:");
  console.log(`DEAL_FACTORY_ADDRESS=${factory.address}`);
  console.log(`DEAL_POSITION_ADDRESS=${positionNFT}`);
  console.log(`CHANNEL_REGISTRY_ADDRESS=${channelRegistry}`);
  console.log(`FLARE_PRICE_READER_ADDRESS=${priceReader}`);
  console.log();
  console.log("🔗 View on Explorer:");
  console.log(`https://coston2-explorer.flare.network/address/${factory.address}`);
  console.log();
  console.log("✨ Deployment complete! Ready for Yellow & LayerZero integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
