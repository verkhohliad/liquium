import { network } from "hardhat";

async function main() {
  console.log("🚀 Deploying Liquium contracts to Flare Mainnet...\n");

  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  // Flare Mainnet Configuration
  const FTSO_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"; // Flare mainnet FTSO registry
  const YELLOW_NODE_ENDPOINT = "wss://mainnet.yellow.org";
  const YELLOW_APP_ID = ethers.keccak256(ethers.toUtf8Bytes("liquium-v1"));

  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "FLR\n");
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", chainId.toString(), "\n");

  // Step 1: Deploy DealPosition NFT
  console.log("📦 1/8 Deploying DealPosition NFT...");
  const DealPosition = await ethers.getContractFactory("DealPosition");
  const positionNFT = await DealPosition.deploy(deployer.address);
  await positionNFT.waitForDeployment();
  const positionAddress = await positionNFT.getAddress();
  console.log("✅ DealPosition:", positionAddress, "\n");

  // Step 2: Deploy ChannelRegistry
  console.log("📦 2/8 Deploying ChannelRegistry...");
  const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
  const channelRegistry = await ChannelRegistry.deploy(deployer.address);
  await channelRegistry.waitForDeployment();
  const registryAddress = await channelRegistry.getAddress();
  console.log("✅ ChannelRegistry:", registryAddress, "\n");

  // Step 3: Deploy MockProtocol
  console.log("📦 3/8 Deploying MockProtocol (10% APY simulator)...");
  const MockProtocol = await ethers.getContractFactory("MockProtocol");
  const mockProtocol = await MockProtocol.deploy(deployer.address);
  await mockProtocol.waitForDeployment();
  const mockProtocolAddress = await mockProtocol.getAddress();
  console.log("✅ MockProtocol:", mockProtocolAddress, "\n");

  // Step 4: Deploy FlarePriceReader (with real FTSO)
  console.log("📦 4/8 Deploying FlarePriceReader (with FTSO)...");
  console.log("✅ Using Flare FTSO Registry:", FTSO_REGISTRY, "\n");
  const FlarePriceReader = await ethers.getContractFactory("FlarePriceReader");
  const priceReader = await FlarePriceReader.deploy(
    deployer.address,
    FTSO_REGISTRY
  );
  await priceReader.waitForDeployment();
  const priceReaderAddress = await priceReader.getAddress();
  console.log("✅ FlarePriceReader:", priceReaderAddress, "\n");

  // Step 5: Deploy DealVault
  console.log("📦 5/8 Deploying DealVault...");
  const DealVault = await ethers.getContractFactory("DealVault");
  const dealVault = await DealVault.deploy(
    deployer.address,
    positionAddress,
    registryAddress,
    priceReaderAddress,
    deployer.address // feeRecipient
  );
  await dealVault.waitForDeployment();
  const vaultAddress = await dealVault.getAddress();
  console.log("✅ DealVault:", vaultAddress, "\n");

  // Step 6: Deploy YellowChannel
  // console.log("📦 6/8 Deploying YellowChannel...");
  // const YellowChannel = await ethers.getContractFactory("YellowChannel");
  // const yellowChannel = await YellowChannel.deploy(
  //   deployer.address,
  //   registryAddress,
  //   YELLOW_NODE_ENDPOINT,
  //   YELLOW_APP_ID
  // );
  // await yellowChannel.waitForDeployment();
  // const yellowAddress = await yellowChannel.getAddress();
  // console.log("✅ YellowChannel:", yellowAddress, "\n");

  // Step 7: Deploy NitroliteAdapter
  // console.log("📦 7/8 Deploying NitroliteAdapter...");
  // const NitroliteAdapter = await ethers.getContractFactory("NitroliteAdapter");
  // const adapter = await NitroliteAdapter.deploy(
  //   deployer.address,
  //   vaultAddress,
  //   yellowAddress
  // );
  // await adapter.waitForDeployment();
  // const adapterAddress = await adapter.getAddress();
  // console.log("✅ NitroliteAdapter:", adapterAddress, "\n");

  // // Step 8: Deploy YellowRewardDistributor
  // console.log("📦 8/8 Deploying YellowRewardDistributor...");
  // const YellowRewardDistributor = await ethers.getContractFactory("YellowRewardDistributor");
  // const rewardDistributor = await YellowRewardDistributor.deploy(
  //   deployer.address,
  //   vaultAddress,
  //   yellowAddress
  // );
  // await rewardDistributor.waitForDeployment();
  // const distributorAddress = await rewardDistributor.getAddress();
  // console.log("✅ YellowRewardDistributor:", distributorAddress, "\n");

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
  console.log("🎉 LIQUIUM FLARE MAINNET DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Core Contracts:");
  console.log(`  DealPosition NFT:          ${positionAddress}`);
  console.log(`  ChannelRegistry:           ${registryAddress}`);
  console.log(`  MockProtocol (10% APY):    ${mockProtocolAddress}`);
  console.log(`  FlarePriceReader (FTSO):   ${priceReaderAddress}`);
  console.log(`  DealVault:                 ${vaultAddress}\n`);

  // console.log("🟡 Yellow Network Integration:");
  // console.log(`  YellowChannel:             ${yellowAddress}`);
  // console.log(`  NitroliteAdapter:          ${adapterAddress}`);
  // console.log(`  YellowRewardDistributor:   ${distributorAddress}\n`);

  console.log("💾 Save to .env:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`DEAL_POSITION_ADDRESS=${positionAddress}`);
  console.log(`CHANNEL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`MOCK_PROTOCOL_ADDRESS=${mockProtocolAddress}`);
  console.log(`PRICE_READER_ADDRESS=${priceReaderAddress}`);
  console.log(`DEAL_VAULT_ADDRESS=${vaultAddress}`);
  // console.log(`YELLOW_CHANNEL_ADDRESS=${yellowAddress}`);
  // console.log(`NITROLITE_ADAPTER_ADDRESS=${adapterAddress}`);
  // console.log(`REWARD_DISTRIBUTOR_ADDRESS=${distributorAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log(`🔗 Flare Explorer: https://flare-explorer.flare.network/address/${vaultAddress}\n`);

  console.log("✨ Next Steps:");
  console.log("1. Run verification script: npx hardhat run scripts/verify-flare.ts --network flare");
  console.log("2. Fund MockProtocol with tokens for reward payouts");
  console.log("3. Configure token symbols for FTSO price feeds");
  console.log("4. Create test deal");
  console.log("5. Test full flow with real FTSO price data\n");

  console.log("📊 Integration Details:");
  console.log("✅ Yellow Network - State channels for reward distribution");
  console.log("✅ MockProtocol - 10% simple interest simulator");
  console.log("✅ Flare FTSO - Real-time decentralized price feeds\n");

  console.log("🧪 Example Usage:");
  console.log("// Create deal with single token (deposit and rewards in same token)");
  console.log(`await dealVault.createDeal(USDC, minDep, maxDep, 30days, 1000);`);
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
  console.log("await dealVault.withdraw(positionId);\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
