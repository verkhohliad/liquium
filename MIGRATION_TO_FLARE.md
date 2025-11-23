# Migration to Flare Mainnet - Update Guide

**Date:** 2025-11-22
**Status:** ✅ Backend and Frontend Updated for Flare Mainnet with 5 Core Contracts

---

## 🎯 What Changed

You've switched from **Base Sepolia** to **Flare Mainnet** and simplified the deployment to **5 core contracts only** (no Yellow Network integration).

### Before (Base Sepolia - 8 Contracts)
```
✅ DealPosition
✅ ChannelRegistry
✅ MockProtocol
✅ MockPriceReader
✅ DealVault
✅ YellowChannel ← REMOVED
✅ NitroliteAdapter ← REMOVED
✅ YellowRewardDistributor ← REMOVED
```

### After (Flare Mainnet - 5 Core Contracts)
```
✅ DealPosition
✅ ChannelRegistry (deployed but unused - required by DealVault constructor)
✅ MockProtocol
✅ FlarePriceReader (uses real FTSO instead of MockPriceReader)
✅ DealVault
```

**Network:** Flare Mainnet (Chain ID: 14)
**RPC:** https://rpc.ankr.com/flare
**Explorer:** https://flare-explorer.flare.network/

---

## ✅ What Has Been Updated

### 1. Frontend Files Updated

**`/frontend-demo/src/lib/wagmi.ts`**
- ✅ Removed `baseSepolia` from chains, kept only `flare`
- ✅ Removed `YELLOW_CHANNEL` and `REWARD_DISTRIBUTOR` from CONTRACTS
- ✅ Added `CHANNEL_REGISTRY` (was missing)
- ✅ Changed contract addresses to placeholders (waiting for your Flare deployment)
- ✅ Updated comments to indicate Flare Mainnet

**`/frontend/src/lib/wagmi.ts`** (Main frontend)
- ✅ Changed default chain from `baseSepolia` to `flare`
- ✅ Updated transports to use `flare.id` instead of `baseSepolia.id`

**`/frontend/src/lib/contracts.ts`**
- ✅ Removed Yellow Network contracts (YellowChannel, NitroliteAdapter, RewardDistributor)
- ✅ Removed `RewardDistributorABI`
- ✅ Changed CHAIN_ID from 84532 (Base Sepolia) to 14 (Flare Mainnet)
- ✅ Updated all contract addresses to placeholders
- ✅ Added note explaining Yellow integration removal

### 2. Backend Files Updated

**`/backend-demo/src/config/contracts.ts`** (NEW FILE)
- ✅ Created centralized contract configuration
- ✅ Only includes 5 core contracts
- ✅ Uses environment variables for contract addresses
- ✅ Includes Flare RPC URL configuration

**`/backend-demo/src/services/indexer.service.ts`**
- ✅ Removed `YellowRewardDistributorABI` import
- ✅ Removed `indexRewardDistributorEvents()` function
- ✅ Removed all Yellow Network event listeners
- ✅ Changed RPC connection to use Flare mainnet
- ✅ Updated to import from new `config/contracts.ts`

---

## 🚀 Next Steps - After You Deploy to Flare

### Step 1: Deploy Contracts to Flare

Run the simplified Flare deployment script:

```bash
cd contracts
npx hardhat run scripts/deploy-flare.ts --network flare
```

**Note:** Make sure your `.env` has:
```bash
PRIVATE_KEY_DEPLOYER=your_flare_wallet_private_key
FLARE_MAINNET_RPC_URL=https://rpc.ankr.com/flare
```

You'll get output like:
```
DEAL_POSITION_ADDRESS=0x...
CHANNEL_REGISTRY_ADDRESS=0x...
MOCK_PROTOCOL_ADDRESS=0x...
PRICE_READER_ADDRESS=0x...
DEAL_VAULT_ADDRESS=0x...
```

### Step 2: Update Frontend Contract Addresses

Replace placeholders in **both** frontend directories:

**File 1: `/frontend-demo/src/lib/wagmi.ts`**
```typescript
export const CONTRACTS = {
  DEAL_POSITION: '0xYOUR_FLARE_ADDRESS' as `0x${string}`,
  CHANNEL_REGISTRY: '0xYOUR_FLARE_ADDRESS' as `0x${string}`,
  MOCK_PROTOCOL: '0xYOUR_FLARE_ADDRESS' as `0x${string}`,
  PRICE_READER: '0xYOUR_FLARE_ADDRESS' as `0x${string}`,
  DEAL_VAULT: '0xYOUR_FLARE_ADDRESS' as `0x${string}`,
} as const
```

**File 2: `/frontend/src/lib/contracts.ts`**
```typescript
export const CONTRACTS = {
  DealPosition: "0xYOUR_FLARE_ADDRESS",
  ChannelRegistry: "0xYOUR_FLARE_ADDRESS",
  MockProtocol: "0xYOUR_FLARE_ADDRESS",
  PriceReader: "0xYOUR_FLARE_ADDRESS",
  DealVault: "0xYOUR_FLARE_ADDRESS",
} as const;

export const TEST_USDC = "0xYOUR_FLARE_USDC_ADDRESS";
```

### Step 3: Update Backend Environment Variables

Create/update `/backend-demo/.env`:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/liquium

# Flare Mainnet RPC
RPC_URL=https://rpc.ankr.com/flare

# Contract Addresses (from deploy-flare.ts output)
DEAL_POSITION_ADDRESS=0x...
CHANNEL_REGISTRY_ADDRESS=0x...
MOCK_PROTOCOL_ADDRESS=0x...
PRICE_READER_ADDRESS=0x...
DEAL_VAULT_ADDRESS=0x...

# Indexer
ENABLE_INDEXER=true
PORT=3000
```

### Step 4: Verify Configuration

```bash
# Backend
cd backend-demo
pnpm install
pnpm db:push
pnpm dev

# Frontend (in new terminal)
cd frontend-demo
pnpm install
pnpm dev
```

Visit http://localhost:5173 and ensure:
- ✅ Wallet connects to Flare Mainnet (Chain ID: 14)
- ✅ Contract addresses are correct
- ✅ No errors in browser console

---

## 🔄 User Flow Changes (Without Yellow)

### Old Flow (With Yellow Network)
```
1. Admin creates deal ✅
2. Users deposit ✅
3. Admin locks deal ✅
4. Admin deposits to protocol ✅
5. Admin claims rewards ✅
6. Admin distributes to Yellow channels ← REMOVED
7. Users trade on Yellow Network ← REMOVED
8. Users settle and withdraw ← REMOVED
```

### New Simplified Flow
```
1. Admin creates deal ✅
2. Users deposit ✅
3. Admin locks deal ✅
4. Admin deposits to protocol ✅
5. Admin claims rewards ✅
6. Users withdraw rewards directly ✅ NEW!
   └─> withdraw(positionId) - burns NFT, sends principal + rewards
   └─> claimPosition(positionId) - keeps NFT, sends rewards only
```

**Result:** 3 steps removed, simpler UX, same core functionality!

---

## 📊 Database Schema Notes

The Prisma schema still includes `YellowChannel` table and `yellowAddress` / `yellowChannelId` fields:

```prisma
model YellowChannel {
  id              String   @id @default(uuid())
  channelId       String   @unique
  dealId          Int
  userAddress     String
  yellowAddress   String
  rewardAmount    String
  status          String   @default("open")
}
```

**This is fine!** These tables won't be populated when Yellow integration isn't used. You can:
- **Option 1:** Leave them (no harm, just empty tables)
- **Option 2:** Remove them from schema and run `pnpm db:push` again

---

## 🧪 Testing Checklist

After updating addresses, test the full flow:

- [ ] Deploy contracts to Flare mainnet
- [ ] Update frontend contract addresses
- [ ] Update backend .env with contract addresses
- [ ] Start backend (`pnpm dev` in backend-demo)
- [ ] Start frontend (`pnpm dev` in frontend-demo)
- [ ] Connect wallet to Flare mainnet
- [ ] Create a test deal (admin function)
- [ ] Deposit to deal (user function)
- [ ] Lock deal (admin function)
- [ ] Deposit to protocol (admin function)
- [ ] Claim rewards from protocol (admin function)
- [ ] Withdraw rewards (user function) ← New simplified step!
- [ ] Verify backend indexer picked up all events
- [ ] Check Prisma Studio to see database records

---

## 🎨 Frontend Components to Update/Remove

### Remove These (Yellow-specific)
```
❌ YellowTradingMock.tsx
❌ DistributeYellowButton.tsx
❌ Yellow Network modal/dialog
❌ Channel balance display
❌ Any RewardDistributor interaction components
```

### Add These (Direct Withdrawal)
```
✅ WithdrawButton.tsx - calls DealVault.withdraw(positionId)
✅ MyRewards.tsx - shows user rewards with withdraw button
✅ Updated DealDetails.tsx - no Yellow references
```

**Example Withdraw Component:**
```typescript
// components/rewards/WithdrawButton.tsx
import { useWriteContract } from 'wagmi'
import { CONTRACTS } from '@/lib/wagmi'
import DealVaultABI from '@/contracts/DealVault.json'

export function WithdrawButton({ positionId }: { positionId: number }) {
  const { writeContractAsync } = useWriteContract()

  const handleWithdraw = async () => {
    await writeContractAsync({
      address: CONTRACTS.DEAL_VAULT,
      abi: DealVaultABI,
      functionName: 'withdraw',
      args: [BigInt(positionId)],
    })
  }

  return <Button onClick={handleWithdraw}>Withdraw Rewards</Button>
}
```

---

## 🛠️ Key Differences: Flare vs Base

| Feature | Base Sepolia | Flare Mainnet |
|---------|--------------|---------------|
| **Chain ID** | 84532 | 14 |
| **Price Oracle** | MockPriceReader (fixed prices) | FlarePriceReader (real FTSO) |
| **Network Type** | Testnet | Mainnet |
| **Explorer** | BaseScan | Flare Explorer |
| **Native Token** | ETH | FLR |

**Important:** On Flare, you're using **FlarePriceReader** which connects to the real FTSO (Flare Time Series Oracle) for decentralized price feeds!

FTSO Registry on Flare: `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`

---

## 📝 Summary of Changes

### Removed
- ❌ Yellow Network contracts (3 contracts)
- ❌ Yellow Network event indexing
- ❌ RewardDistributor ABI from frontend
- ❌ Base Sepolia configuration
- ❌ MockPriceReader (replaced with FlarePriceReader on Flare)

### Added
- ✅ Flare mainnet support
- ✅ Direct withdrawal functionality
- ✅ Centralized backend contract config
- ✅ FTSO price oracle integration
- ✅ Simplified deployment script

### Updated
- ✅ All frontend chain configs to Flare
- ✅ All backend RPC to Flare mainnet
- ✅ Contract address placeholders
- ✅ User flow documentation

---

## 🆘 Troubleshooting

**Q: Frontend shows "Wrong Network"?**
- Ensure MetaMask is on Flare Mainnet (Chain ID: 14)
- Add Flare manually: https://chainlist.org/chain/14

**Q: Backend indexer not picking up events?**
- Check `RPC_URL` in .env points to Flare
- Verify contract addresses are correct
- Check logs: `pnpm dev` in backend-demo

**Q: Transactions failing?**
- Ensure wallet has FLR for gas
- Check contract addresses match deployment
- Verify MockProtocol is funded with test tokens

**Q: Where do I get test USDC on Flare?**
- Deploy your own ERC20 test token
- Or find existing USDC on Flare mainnet

---

## ✨ You're Ready!

All configurations have been updated. Just waiting for you to:
1. Deploy to Flare mainnet
2. Copy the addresses to frontend and backend
3. Test the simplified flow

**Result:** Simpler deployment, fewer contracts, same core value proposition!

Good luck! 🚀
