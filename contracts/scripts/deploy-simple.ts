import { network } from "hardhat";

async function main() {
  console.log("🚀 Deploying Liquium contracts to Flare Coston2...\n");

  // Connect to network and get ethers
  const { ethers } = await network.connect();

  // FTSO Registry on Coston2
  const FTSO_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  
  console.log("📍 Deploying from:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "FLR");
  console.log();

  // Deploy DealFactory (which deploys all core contracts)
  console.log("📦 Deploying DealFactory...");
  const factory = await ethers.deployContract("DealFactory", [
    deployer.address,      // initialOwner
    FTSO_REGISTRY,         // ftsoRegistry  
    deployer.address       // defaultFeeRecipient
  ]);

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ DealFactory deployed at:", factoryAddress);
  console.log();

  // Get core contract addresses
  console.log("🔍 Fetching core contract addresses...");
  const [positionNFT, channelRegistry, priceReader] = await factory.getCoreContracts();

  console.log("📋 Core Contracts Deployed:");
  console.log("  - DealFactory:       ", factoryAddress);
  console.log("  - DealPosition (NFT):", positionNFT);
  console.log("  - ChannelRegistry:   ", channelRegistry);
  console.log("  - FlarePriceReader:  ", priceReader);
  console.log();

  // Deploy first vault
  console.log("🏦 Deploying first DealVault...");
  const deployVaultTx = await factory.deployVault(ethers.ZeroAddress);
  await deployVaultTx.wait();
  
  const vaultCount = await factory.getVaultCount();
  const vaultAddress = await factory.getVault(Number(vaultCount) - 1);

  console.log("✅ DealVault deployed at:", vaultAddress);
  console.log();

  // Summary
  console.log("🎉 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Factory:        ${factoryAddress}`);
  console.log(`Position NFT:   ${positionNFT}`);
  console.log(`Channel Reg:    ${channelRegistry}`);
  console.log(`Price Reader:   ${priceReader}`);
  console.log(`First Vault:    ${vaultAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();
  console.log("💾 Save these addresses to your .env file:");
  console.log(`DEAL_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`DEAL_POSITION_ADDRESS=${positionNFT}`);
  console.log(`CHANNEL_REGISTRY_ADDRESS=${channelRegistry}`);
  console.log(`FLARE_PRICE_READER_ADDRESS=${priceReader}`);
  console.log();
  console.log("🔗 View on Explorer:");
  console.log(`https://coston2-explorer.flare.network/address/${factoryAddress}`);
  console.log();
  console.log("✨ Deployment complete! Ready for Yellow & LayerZero integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
