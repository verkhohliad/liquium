import { network } from "hardhat";

async function main() {
  console.log("🚀 Deploying Liquium Core Contracts (No Yellow Integration)...\n");

  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");
  console.log("🔗 Chain ID:", chainId.toString(), "\n");

  // Step 1: Deploy DealPosition NFT
  console.log("📦 1/4 Deploying DealPosition NFT...");
  const DealPosition = await ethers.getContractFactory("DealPosition");
  const positionNFT = await DealPosition.deploy(deployer.address);
  await positionNFT.waitForDeployment();
  const positionAddress = await positionNFT.getAddress();
  console.log("✅ DealPosition:", positionAddress, "\n");

  // Step 2: Deploy ChannelRegistry (needed by DealVault constructor)
  console.log("📦 2/5 Deploying ChannelRegistry...");
  console.log("⚠️  Note: Deployed but won't be used (no Yellow integration)\n");
  const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
  const channelRegistry = await ChannelRegistry.deploy(deployer.address);
  await channelRegistry.waitForDeployment();
  const registryAddress = await channelRegistry.getAddress();
  console.log("✅ ChannelRegistry:", registryAddress, "\n");

  // Step 3: Deploy MockProtocol
  console.log("📦 3/5 Deploying MockProtocol (10% APY simulator)...");
  const MockProtocol = await ethers.getContractFactory("MockProtocol");
  const mockProtocol = await MockProtocol.deploy(deployer.address);
  await mockProtocol.waitForDeployment();
  const mockProtocolAddress = await mockProtocol.getAddress();
  console.log("✅ MockProtocol:", mockProtocolAddress, "\n");

  // Step 4: Deploy MockPriceReader (for Base - no FTSO)
  console.log("📦 4/5 Deploying MockPriceReader...");
  console.log("⚠️  Note: Using mock price reader with fixed prices.\n");
  const MockPriceReader = await ethers.getContractFactory("MockPriceReader");
  const priceReader = await MockPriceReader.deploy(deployer.address);
  await priceReader.waitForDeployment();
  const priceReaderAddress = await priceReader.getAddress();
  console.log("✅ MockPriceReader:", priceReaderAddress, "\n");

  // Step 5: Deploy DealVault
  console.log("📦 5/5 Deploying DealVault...");
  const DealVault = await ethers.getContractFactory("DealVault");
  const dealVault = await DealVault.deploy(
    deployer.address,
    positionAddress,
    registryAddress, // ChannelRegistry (required but unused)
    priceReaderAddress,
    deployer.address // feeRecipient
  );
  await dealVault.waitForDeployment();
  const vaultAddress = await dealVault.getAddress();
  console.log("✅ DealVault:", vaultAddress, "\n");

  // Configuration
  console.log("⚙️  Configuring contracts...\n");

  // Authorize vault to mint positions
  console.log("🔐 Authorizing DealVault to mint positions...");
  await positionNFT.setVaultAuthorization(vaultAddress, true);
  console.log("✅ Vault authorized\n");

  // Set MockProtocol address in DealVault
  console.log("🔗 Setting MockProtocol address in DealVault...");
  await dealVault.setProtocolAddress(mockProtocolAddress);
  console.log("✅ Protocol address set\n");

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 LIQUIUM CORE DEPLOYMENT COMPLETE (SIMPLIFIED)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Deployed Contracts:");
  console.log(`  DealPosition NFT:          ${positionAddress}`);
  console.log(`  ChannelRegistry:           ${registryAddress} (unused)`);
  console.log(`  MockProtocol (10% APY):    ${mockProtocolAddress}`);
  console.log(`  MockPriceReader:           ${priceReaderAddress}`);
  console.log(`  DealVault:                 ${vaultAddress}\n`);

  console.log("💾 Save to .env:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`DEAL_POSITION_ADDRESS=${positionAddress}`);
  console.log(`CHANNEL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`MOCK_PROTOCOL_ADDRESS=${mockProtocolAddress}`);
  console.log(`PRICE_READER_ADDRESS=${priceReaderAddress}`);
  console.log(`DEAL_VAULT_ADDRESS=${vaultAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const explorerUrl = chainId === 84532n
    ? "https://sepolia.basescan.org"
    : "https://basescan.org";

  console.log(`🔗 Explorer: ${explorerUrl}/address/${vaultAddress}\n`);

  console.log("✨ Core Functionality:");
  console.log("✅ Create deals");
  console.log("✅ Users deposit with Position NFTs");
  console.log("✅ Lock deals");
  console.log("✅ Deposit to MockProtocol");
  console.log("✅ Claim 10% rewards");
  console.log("✅ Users withdraw rewards directly\n");

  console.log("🧪 Example Usage:");
  console.log("// Create deal with single token (deposit and rewards in same token)");
  console.log(`await dealVault.createDeal(USDC, 10e6, 1000e6, 30days, 1000);`);
  console.log("");
  console.log("// Users deposit");
  console.log("await usdc.approve(vaultAddress, amount);");
  console.log("await dealVault.deposit(dealId, amount);");
  console.log("");
  console.log("// Admin: Lock and deploy to protocol");
  console.log("await dealVault.lockDeal(dealId);");
  console.log("await dealVault.depositToProtocol(dealId);");
  console.log("");
  console.log("// Admin: Claim rewards (protocol dictates actual yield)");
  console.log("await dealVault.claimRewardsFromProtocol(dealId);");
  console.log("");
  console.log("// Users: Withdraw principal + rewards");
  console.log("await dealVault.withdraw(positionId); // Burns NFT, sends principal + rewards");
  console.log("");
  console.log("// Or claim without burning NFT:");
  console.log("await dealVault.claimPosition(positionId); // Keeps NFT, sends principal + rewards\n");

  console.log("⚠️  Skipped (Not Needed for Core Flow):");
  console.log("❌ YellowChannel - State channel infrastructure");
  console.log("❌ NitroliteAdapter - Yellow integration bridge");
  console.log("❌ YellowRewardDistributor - Reward distribution to channels");
  console.log("💡 Users can withdraw rewards directly without Yellow Network\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
