import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { network } from "hardhat";

/**
 * Verification script for Flare Mainnet deployment
 *
 * Usage:
 * 1. Deploy contracts using: npx hardhat run scripts/deploy-flare.ts --network flare
 * 2. Copy deployed addresses to .env
 * 3. Run: npx hardhat run scripts/verify-flare.ts --network flare
 */

async function main() {
  console.log("🔍 Verifying Liquium contracts on Flare Mainnet...\n");

  const { ethers } = await network.connect();

  // Get deployer address
  const [deployer] = await ethers.getSigners();
  const DEPLOYER = deployer.address;

  console.log("📍 Deployer:", DEPLOYER);
  console.log("🌐 Network:", hre.network.name, "\n");

  // Contract addresses - UPDATE THESE AFTER DEPLOYMENT
  const addresses = {
    DEAL_POSITION: process.env.DEAL_POSITION_ADDRESS || "",
    CHANNEL_REGISTRY: process.env.CHANNEL_REGISTRY_ADDRESS || "",
    MOCK_PROTOCOL: process.env.MOCK_PROTOCOL_ADDRESS || "",
    PRICE_READER: process.env.PRICE_READER_ADDRESS || "",
    DEAL_VAULT: process.env.DEAL_VAULT_ADDRESS || "",
    YELLOW_CHANNEL: process.env.YELLOW_CHANNEL_ADDRESS || "",
    NITROLITE_ADAPTER: process.env.NITROLITE_ADAPTER_ADDRESS || "",
    REWARD_DISTRIBUTOR: process.env.REWARD_DISTRIBUTOR_ADDRESS || "",
  };

  // Validate addresses
  const missingAddresses = Object.entries(addresses)
    .filter(([_, addr]) => !addr)
    .map(([name, _]) => name);

  if (missingAddresses.length > 0) {
    console.error("❌ Missing contract addresses in .env:");
    missingAddresses.forEach(name => console.error(`   - ${name}`));
    console.error("\n💡 Add these to your .env file or update this script with deployed addresses\n");
    process.exit(1);
  }

  console.log("📋 Verifying contracts:");
  Object.entries(addresses).forEach(([name, addr]) => {
    console.log(`   ${name}: ${addr}`);
  });
  console.log("");

  // Flare configuration
  const FTSO_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
  const YELLOW_NODE_ENDPOINT = "wss://mainnet.yellow.org";
  const YELLOW_APP_ID = ethers.keccak256(ethers.toUtf8Bytes("liquium-v1"));

  try {
    // 1. Verify DealPosition
    console.log("1️⃣  Verifying DealPosition...");
    await verifyContract(
      {
        address: addresses.DEAL_POSITION,
        constructorArgs: [DEPLOYER],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ DealPosition verified!\n");

    // 2. Verify ChannelRegistry
    console.log("2️⃣  Verifying ChannelRegistry...");
    await verifyContract(
      {
        address: addresses.CHANNEL_REGISTRY,
        constructorArgs: [DEPLOYER],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ ChannelRegistry verified!\n");

    // 3. Verify MockProtocol
    console.log("3️⃣  Verifying MockProtocol...");
    await verifyContract(
      {
        address: addresses.MOCK_PROTOCOL,
        constructorArgs: [DEPLOYER],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ MockProtocol verified!\n");

    // 4. Verify FlarePriceReader (with real FTSO)
    console.log("4️⃣  Verifying FlarePriceReader (with FTSO)...");
    await verifyContract(
      {
        address: addresses.PRICE_READER,
        constructorArgs: [DEPLOYER, FTSO_REGISTRY],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ FlarePriceReader verified!\n");

    // 5. Verify DealVault
    console.log("5️⃣  Verifying DealVault...");
    await verifyContract(
      {
        address: addresses.DEAL_VAULT,
        constructorArgs: [
          DEPLOYER,
          addresses.DEAL_POSITION,
          addresses.CHANNEL_REGISTRY,
          addresses.PRICE_READER,
          DEPLOYER, // feeRecipient
        ],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ DealVault verified!\n");

    // 6. Verify YellowChannel
    console.log("6️⃣  Verifying YellowChannel...");
    await verifyContract(
      {
        address: addresses.YELLOW_CHANNEL,
        constructorArgs: [
          DEPLOYER,
          addresses.CHANNEL_REGISTRY,
          YELLOW_NODE_ENDPOINT,
          YELLOW_APP_ID,
        ],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ YellowChannel verified!\n");

    // 7. Verify NitroliteAdapter
    console.log("7️⃣  Verifying NitroliteAdapter...");
    await verifyContract(
      {
        address: addresses.NITROLITE_ADAPTER,
        constructorArgs: [
          DEPLOYER,
          addresses.DEAL_VAULT,
          addresses.YELLOW_CHANNEL,
        ],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ NitroliteAdapter verified!\n");

    // 8. Verify YellowRewardDistributor
    console.log("8️⃣  Verifying YellowRewardDistributor...");
    await verifyContract(
      {
        address: addresses.REWARD_DISTRIBUTOR,
        constructorArgs: [
          DEPLOYER,
          addresses.DEAL_VAULT,
          addresses.YELLOW_CHANNEL,
        ],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ YellowRewardDistributor verified!\n");

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 ALL CONTRACTS VERIFIED SUCCESSFULLY!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Verified Contracts:");
    console.log(`  DealPosition:             ${addresses.DEAL_POSITION}`);
    console.log(`  ChannelRegistry:          ${addresses.CHANNEL_REGISTRY}`);
    console.log(`  MockProtocol:             ${addresses.MOCK_PROTOCOL}`);
    console.log(`  FlarePriceReader (FTSO):  ${addresses.PRICE_READER}`);
    console.log(`  DealVault:                ${addresses.DEAL_VAULT}`);
    console.log(`  YellowChannel:            ${addresses.YELLOW_CHANNEL}`);
    console.log(`  NitroliteAdapter:         ${addresses.NITROLITE_ADAPTER}`);
    console.log(`  YellowRewardDistributor:  ${addresses.REWARD_DISTRIBUTOR}\n`);

    console.log(`🔗 View on Flare Explorer:`);
    console.log(`https://flare-explorer.flare.network/address/${addresses.DEAL_VAULT}#code\n`);

    console.log("✨ Next Steps:");
    console.log("1. ✅ Contracts deployed and verified on Flare");
    console.log("2. Configure FTSO token symbols");
    console.log("3. Fund MockProtocol with test tokens");
    console.log("4. Create your first deal with FTSO price tracking!");

  } catch (error: any) {
    console.error("\n❌ Verification failed:");

    if (error.message?.includes("Already Verified")) {
      console.log("ℹ️  Contract already verified on Flare Explorer");
    } else {
      console.error(error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
