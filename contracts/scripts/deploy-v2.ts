import { network } from "hardhat";

async function main() {
  console.log("🚀 Deploying Liquium V2 contracts to Flare Coston2...\n");

  const { ethers } = await network.connect();

  // Flare Coston2 Configuration
  const FTSO_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
  const YELLOW_NODE_ENDPOINT = "wss://testnet.yellow.org";
  const YELLOW_APP_ID = ethers.keccak256(ethers.toUtf8Bytes("liquium-v1"));
  
  const [deployer] = await ethers.getSigners();
  
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "FLR\n");

  // Step 1: Deploy DealPosition NFT
  console.log("📦 1/7 Deploying DealPosition NFT v2...");
  const DealPosition = await ethers.getContractFactory("DealPosition");
  const positionNFT = await DealPosition.deploy(deployer.address);
  await positionNFT.waitForDeployment();
  const positionAddress = await positionNFT.getAddress();
  console.log("✅ DealPosition:", positionAddress, "\n");

  // Step 2: Deploy ChannelRegistry
  console.log("📦 2/6 Deploying ChannelRegistry...");
  const ChannelRegistry = await ethers.getContractFactory("ChannelRegistry");
  const channelRegistry = await ChannelRegistry.deploy(deployer.address);
  await channelRegistry.waitForDeployment();
  const registryAddress = await channelRegistry.getAddress();
  console.log("✅ ChannelRegistry:", registryAddress, "\n");

  // Step 3: Deploy FlarePriceReader
  console.log("📦 3/6 Deploying FlarePriceReader...");
  const FlarePriceReader = await ethers.getContractFactory("FlarePriceReader");
  const priceReader = await FlarePriceReader.deploy(
    deployer.address,
    FTSO_REGISTRY
  );
  await priceReader.waitForDeployment();
  const priceReaderAddress = await priceReader.getAddress();
  console.log("✅ FlarePriceReader:", priceReaderAddress, "\n");

  // Step 4: Deploy DealVault v2
  console.log("📦 4/6 Deploying DealVault v2 (with FTSO)...");
  const DealVault = await ethers.getContractFactory("DealVault");
  const dealVault = await DealVault.deploy(
    deployer.address,
    positionAddress,
    registryAddress,
    priceReaderAddress,
    deployer.address  // feeRecipient
  );
  await dealVault.waitForDeployment();
  const vaultAddress = await dealVault.getAddress();
  console.log("✅ DealVault v2:", vaultAddress, "\n");

  // Step 5: Authorize vault to mint positions
  console.log("🔐 5/7 Authorizing DealVault to mint positions...");
  await positionNFT.setVaultAuthorization(vaultAddress, true);
  console.log("✅ Vault authorized\n");

  // Step 6: Deploy YellowChannel
  console.log("📦 6/6 Deploying YellowChannel...");
  const YellowChannel = await ethers.getContractFactory("YellowChannel");
  const yellowChannel = await YellowChannel.deploy(
    deployer.address,
    registryAddress,
    YELLOW_NODE_ENDPOINT,
    YELLOW_APP_ID
  );
  await yellowChannel.waitForDeployment();
  const yellowAddress = await yellowChannel.getAddress();
  console.log("✅ YellowChannel:", yellowAddress, "\n");

  // Step 7: Deploy NitroliteAdapter
  console.log("📦 7/7 Deploying NitroliteAdapter...");
  const NitroliteAdapter = await ethers.getContractFactory("NitroliteAdapter");
  const adapter = await NitroliteAdapter.deploy(
    deployer.address,
    vaultAddress,
    yellowAddress
  );
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("✅ NitroliteAdapter:", adapterAddress, "\n");

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 LIQUIUM V2 DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Core Contracts:");
  console.log(`  DealPosition NFT:    ${positionAddress}`);
  console.log(`  ChannelRegistry:     ${registryAddress}`);
  console.log(`  FlarePriceReader:    ${priceReaderAddress}`);
  console.log(`  DealVault v2:        ${vaultAddress}\n`);

  console.log("🟡 Yellow/Nitrolite Integration:");
  console.log(`  YellowChannel:       ${yellowAddress}`);
  console.log(`  NitroliteAdapter:    ${adapterAddress}\n`);

  console.log("💾 Save to .env:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`DEAL_POSITION_ADDRESS=${positionAddress}`);
  console.log(`CHANNEL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`FLARE_PRICE_READER_ADDRESS=${priceReaderAddress}`);
  console.log(`DEAL_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`YELLOW_CHANNEL_ADDRESS=${yellowAddress}`);
  console.log(`NITROLITE_ADAPTER_ADDRESS=${adapterAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("🔗 Coston2 Explorer:");
  console.log(`https://coston2-explorer.flare.network/address/${vaultAddress}\n`);

  console.log("✨ Next Steps:");
  console.log("1. Verify contracts on explorer");
  console.log("2. Configure FTSO token symbols");
  console.log("3. Create test deal");
  console.log("4. Test Yellow channel integration\n");

  console.log("📊 Bounties Integrated:");
  console.log("✅ Yellow Network ($10,000) - State channels with ERC-7824");
  console.log("✅ Flare Network ($10,000) - FTSO price feeds\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
