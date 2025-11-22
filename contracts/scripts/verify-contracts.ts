import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

async function main() {
  console.log("🔍 Verifying contracts on Flare Coston2...\n");

  // Contract addresses from deployment
  const DEAL_FACTORY = "0x7b348835A12aaE1fDA26E2Ce8CB9746fcf865b18";
  const DEAL_POSITION = "0xf72E5fDC529d4b096d3a21C76DBaf59416c7ba4A";
  const CHANNEL_REGISTRY = "0xcCDc69e73542A6197E1c1f87F946157edF1CcDb5";
  const FLARE_PRICE_READER = "0xE8f1d81fDe7c82040b1503691cd62a51c7cEB4C5";
  const DEAL_VAULT = "0x9Ad614FcAf12c26e863C9A44Da8F9be44849CD59";

  // Constructor args
  const DEPLOYER = "0x34E057b970D7c230a5e46c7A78C63A370d76c284";
  const FTSO_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

  try {
    // 1. Verify DealFactory
    console.log("1️⃣  Verifying DealFactory...");
    await verifyContract(
      {
        address: DEAL_FACTORY,
        constructorArgs: [DEPLOYER, FTSO_REGISTRY, DEPLOYER],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ DealFactory verified!\n");

    // 2. Verify DealPosition
    console.log("2️⃣  Verifying DealPosition...");
    await verifyContract(
      {
        address: DEAL_POSITION,
        constructorArgs: [DEAL_FACTORY],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ DealPosition verified!\n");

    // 3. Verify ChannelRegistry
    console.log("3️⃣  Verifying ChannelRegistry...");
    await verifyContract(
      {
        address: CHANNEL_REGISTRY,
        constructorArgs: [DEAL_FACTORY],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ ChannelRegistry verified!\n");

    // 4. Verify FlarePriceReader
    console.log("4️⃣  Verifying FlarePriceReader...");
    await verifyContract(
      {
        address: FLARE_PRICE_READER,
        constructorArgs: [DEAL_FACTORY, FTSO_REGISTRY],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ FlarePriceReader verified!\n");

    // 5. Verify DealVault
    console.log("5️⃣  Verifying DealVault...");
    await verifyContract(
      {
        address: DEAL_VAULT,
        constructorArgs: [
          DEPLOYER,
          DEAL_POSITION,
          CHANNEL_REGISTRY,
          FLARE_PRICE_READER,
          DEPLOYER,
        ],
        provider: "etherscan",
      },
      hre,
    );
    console.log("✅ DealVault verified!\n");

    console.log("🎉 All contracts verified successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - DealFactory:     ${DEAL_FACTORY}`);
    console.log(`  - DealPosition:    ${DEAL_POSITION}`);
    console.log(`  - ChannelRegistry: ${CHANNEL_REGISTRY}`);
    console.log(`  - FlarePriceReader: ${FLARE_PRICE_READER}`);
    console.log(`  - DealVault:       ${DEAL_VAULT}`);
    console.log("\n🔗 View on Explorer:");
    console.log(`https://coston2-explorer.flare.network/address/${DEAL_FACTORY}`);
  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
