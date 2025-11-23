# Liquium - DeFi Yield Aggregation Platform

<img width="1277" height="638" alt="image" src="https://github.com/user-attachments/assets/a99b36a9-0f9b-41dd-93d3-f6cf1fa47a82" />


> **Simplified for Hackathon** - Single-token deposits, protocol-dictated yields, clean and simple.

**TL;DR:** Users deposit USDC, we aggregate yields from protocols, distribute rewards proportionally. Simple, clean, effective.

---

## 🎯 What Is Liquium?

Liquium aggregates DeFi yield so users can deposit once and earn optimized returns across multiple protocols.

**Key Features:**
- ✅ Single-token deposits (USDC → USDC rewards)
- ✅ Protocol-dictated yields (works with Aave, Compound, Yearn, etc.)
- ✅ Proportional reward distribution (fair & transparent)
- ✅ Position NFTs (transferable yield positions)
- ✅ Full backend indexing & API

---

## 🏗️ Architecture

### Contracts (Flare Mainnet)
```
DealVault          - Main contract (deposits, rewards, lifecycle)
DealPosition       - Position NFTs (ERC-721)
MockProtocol       - 10% APY simulator for demo
FlarePriceReader   - FTSO price oracle (not used in hackathon version)
ChannelRegistry    - Required by constructor (unused in simplified flow)
```

### Frontend (React + TypeScript)
```
wagmi + viem       - Web3 hooks
shadcn/ui          - UI components
Tailwind CSS       - Styling
RainbowKit         - Wallet connection
```

### Backend (Express + TypeScript)
```
PostgreSQL         - Database
Prisma ORM         - Database ORM
ethers.js v6       - Blockchain interaction
Event Indexer      - Real-time event tracking
```

---

## 🚀 Quick Start

### Prerequisites
```bash
- Node.js v18+
- pnpm (not npm)
- PostgreSQL
- Flare mainnet RPC access
```

### 1. Deploy Contracts

```bash
cd contracts

# Install dependencies
pnpm install

# Deploy to Flare mainnet
npx hardhat run scripts/deploy-flare.ts --network flare
```

You'll get output like:
```
DEAL_POSITION_ADDRESS=0x...
CHANNEL_REGISTRY_ADDRESS=0x...
MOCK_PROTOCOL_ADDRESS=0x...
PRICE_READER_ADDRESS=0x...
DEAL_VAULT_ADDRESS=0x...
```

### 2. Setup Backend

```bash
cd backend-demo

# Install dependencies
pnpm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/liquium
RPC_URL=https://rpc.ankr.com/flare
DEAL_POSITION_ADDRESS=0x...
CHANNEL_REGISTRY_ADDRESS=0x...
MOCK_PROTOCOL_ADDRESS=0x...
PRICE_READER_ADDRESS=0x...
DEAL_VAULT_ADDRESS=0x...
ENABLE_INDEXER=true
PORT=3000
EOF

# Setup database
pnpm db:push

# Start server
pnpm dev
```

Backend runs on http://localhost:3000

### 3. Setup Frontend

```bash
cd frontend-demo

# Install dependencies
pnpm install

# Update src/lib/wagmi.ts with your contract addresses
# Update VITE_WALLETCONNECT_PROJECT_ID in .env

# Start dev server
pnpm dev
```

Frontend runs on http://localhost:5173

---

## 💰 User Flow (Simplified)

```
1. Admin creates deal
   └─> createDeal(USDC, minDeposit, maxDeposit, duration, expectedYield)

2. Users deposit
   └─> approve() + deposit(dealId, amount)
   └─> Receive Position NFT

3. Admin locks deal
   └─> lockDeal(dealId)

4. Admin deposits to protocol
   └─> depositToProtocol(dealId)
   └─> Funds move to MockProtocol (or Aave, Compound, etc.)

5. Protocol generates yield
   └─> MockProtocol returns 10% APY

6. Admin claims rewards
   └─> claimRewardsFromProtocol(dealId)
   └─> Calculates proportional shares for each user

7. Users withdraw
   └─> withdraw(positionId)
   └─> Get principal + rewards in same token
```

---

## 🔧 Smart Contract API

### Create Deal (Admin)
```solidity
function createDeal(
    address depositToken,    // USDC, USDT, etc.
    uint256 minDeposit,     // Minimum deposit (e.g., 10 USDC)
    uint256 maxDeposit,     // Maximum deposit (e.g., 1000 USDC)
    uint256 duration,       // Deal duration in seconds (e.g., 30 days)
    uint256 expectedYield   // Expected yield in bps (e.g., 1000 = 10%)
) external onlyOwner returns (uint256 dealId)
```

**Example:**
```typescript
await dealVault.createDeal(
  USDC_ADDRESS,
  parseUnits('10', 6),      // min: 10 USDC
  parseUnits('1000', 6),    // max: 1000 USDC
  30 * 24 * 60 * 60,       // 30 days
  1000                      // 10% APY
)
```

### Deposit (Users)
```solidity
function deposit(uint256 dealId, uint256 amount)
    external returns (uint256 positionId)
```

**Example:**
```typescript
await usdc.approve(vaultAddress, amount)
await dealVault.deposit(dealId, parseUnits('100', 6))
```

### Withdraw (Users)
```solidity
function withdraw(uint256 positionId) external
```

**Example:**
```typescript
await dealVault.withdraw(positionId)
// Burns NFT, sends principal + rewards
```

### Admin Functions
```solidity
lockDeal(dealId)                    // Lock deal, prevent new deposits
depositToProtocol(dealId)           // Deploy funds to yield protocol
claimRewardsFromProtocol(dealId)    // Claim rewards, calculate shares
```

---

## 📡 Backend API

### Deals
```
GET  /api/deals              - List all deals
GET  /api/deals/:id          - Get deal details
GET  /api/deals/:id/depositors - Get depositors for deal
GET  /api/deals/:id/rewards   - Get rewards breakdown
GET  /api/deals/user/:address - Get user's deals
```

### Deposits
```
GET  /api/deposits/:id        - Get deposit details
GET  /api/deposits/user/:address - Get user deposits
```

### Rewards
```
GET  /api/rewards/user/:address - Get user rewards
GET  /api/rewards/deal/:id   - Get deal rewards
```

### Analytics
```
GET  /api/analytics/tvl      - Total value locked
GET  /api/analytics/deals    - Deal statistics
GET  /api/analytics/leaderboard - Top depositors
```

---

## 🎨 Frontend Components

```typescript
// Create Deal Form (Admin)
import { useDealVault } from '@/hooks/useDealVault'

const { createDeal } = useDealVault()

await createDeal({
  depositToken: USDC_ADDRESS,
  minDeposit: parseUnits('10', 6),
  maxDeposit: parseUnits('1000', 6),
  duration: 30 * 24 * 60 * 60,
  expectedYield: 1000,
})
```

```typescript
// Deposit Form (Users)
const { deposit } = useDealVault()

await deposit(dealId, parseUnits('100', 6))
```

```typescript
// Withdraw Button (Users)
<Button onClick={() => withdraw(positionId)}>
  Withdraw Rewards
</Button>
```

---

## 🎬 10-Minute Demo Script

### Setup (Before Demo)
1. Deploy contracts to Flare
2. Fund MockProtocol with test USDC
3. Create one test deal
4. Have 3 wallets ready with test USDC

### Demo Flow

**Slide 1: Problem** (2 min)
- DeFi has yield, but fragmented
- Users need to manage multiple protocols
- Liquium aggregates and automates

**Slide 2: Create Deal** (1 min)
```typescript
await dealVault.createDeal(USDC, 10e6, 1000e6, 30days, 1000)
```
- Show on Flare Explorer
- Point out: Single token, simple

**Slide 3: Users Deposit** (3 min)
- User 1: 100 USDC
- User 2: 200 USDC
- User 3: 300 USDC
- Show Position NFTs minting
- Total: 600 USDC

**Slide 4: Deploy to Protocol** (2 min)
```typescript
await dealVault.lockDeal(dealId)
await dealVault.depositToProtocol(dealId)
```
- Show 600 USDC moved to MockProtocol

**Slide 5: Claim Rewards** (2 min)
```typescript
await dealVault.claimRewardsFromProtocol(dealId)
```
- Show 60 USDC claimed (10% yield)
- Show proportional distribution:
  - User 1: 10 USDC
  - User 2: 20 USDC
  - User 3: 30 USDC

**Slide 6: Withdraw** (2 min)
```typescript
await dealVault.withdraw(positionId)
```
- User 1 gets 110 USDC (100 + 10)
- Show NFT burned
- Demo complete!

---

## 🔑 Key Talking Points

### Simple Version
> "Liquium aggregates DeFi yield. Deposit USDC, we deploy it to the best protocols, you get USDC rewards back. Simple, clean, effective."

### Technical Version
> "Our smart contracts aggregate deposits, integrate with multiple yield protocols like Aave and Compound, calculate proportional shares on-chain, and distribute rewards automatically. Users get Position NFTs representing their yield positions, which are transferable ERC-721 tokens."

### What Makes It Special
- **Protocol Agnostic** - Works with any yield source
- **On-Chain Distribution** - Fair, transparent, trustless
- **Composable Primitives** - Position NFTs are transferable
- **Real-time Indexing** - Full backend API for analytics

---

## 📊 Current Deployment (Flare Mainnet)

**Network:** Flare Mainnet (Chain ID: 14)
**RPC:** https://rpc.ankr.com/flare
**Explorer:** https://flare-explorer.flare.network/

**Contracts:**
- DealVault: [Deploy and add address]
- DealPosition: [Deploy and add address]
- MockProtocol: [Deploy and add address]
- PriceReader: [Deploy and add address]
- ChannelRegistry: [Deploy and add address]

---

## 🛠️ Tech Stack

### Smart Contracts
- Solidity 0.8.27
- OpenZeppelin Contracts v5.0.0
- Hardhat 3.0

### Frontend
- React 18
- TypeScript 5.9
- wagmi v2.12
- viem v2.21
- RainbowKit v2.2
- Tailwind CSS
- shadcn/ui

### Backend
- Node.js 18+
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- ethers.js v6

---

## ⚙️ Environment Variables

### Contracts (`.env`)
```bash
PRIVATE_KEY_DEPLOYER=0x...
FLARE_MAINNET_RPC_URL=https://rpc.ankr.com/flare
FLARE_EXPLORER_API_KEY=verifyContract
```

### Frontend (`.env`)
```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:3000
```

### Backend (`.env`)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/liquium
RPC_URL=https://rpc.ankr.com/flare
DEAL_POSITION_ADDRESS=0x...
CHANNEL_REGISTRY_ADDRESS=0x...
MOCK_PROTOCOL_ADDRESS=0x...
PRICE_READER_ADDRESS=0x...
DEAL_VAULT_ADDRESS=0x...
ENABLE_INDEXER=true
PORT=3000
```

---

## 🧪 Testing

### Run Contract Tests
```bash
cd contracts
pnpm test
```

### Manual Testing Flow
```bash
# 1. Start backend
cd backend-demo && pnpm dev

# 2. Start frontend
cd frontend-demo && pnpm dev

# 3. Connect wallet (MetaMask, Rainbow, etc.)

# 4. Test flow:
- Create deal (admin)
- Deposit (user)
- Lock deal (admin)
- Deploy to protocol (admin)
- Claim rewards (admin)
- Withdraw (user)
```

---

## 📝 Database Schema

```prisma
model Deal {
  dealId          Int
  depositToken    String
  minDeposit      String
  maxDeposit      String
  totalDeposited  String
  duration        Int
  status          DealStatus
  expectedYield   Int

  deposits        Deposit[]
  rewards         Reward[]
}

model Deposit {
  dealId          Int
  userAddress     String
  amount          String
  positionId      Int
  txHash          String
}

model Reward {
  dealId          Int
  userAddress     String
  rewardAmount    String
  claimed         Boolean
}
```

---

## 🎯 What's Simplified for Hackathon

**Removed:**
- ❌ `targetToken` (multi-asset strategies)
- ❌ `targetChainId` (cross-chain)
- ❌ FTSO price-based PnL calculations
- ❌ Yellow Network integration

**Why:**
- Faster to demo
- Easier to explain
- Cleaner UI
- More protocols compatible

**Can Add Back Later:**
- Cross-chain via LayerZero
- Multi-token structured products
- FTSO price oracle settlement
- Advanced yield strategies

---

## 🚀 Roadmap

### Phase 1: Hackathon (Current)
- ✅ Single-token yield aggregation
- ✅ MockProtocol integration (10% APY)
- ✅ Position NFTs
- ✅ Backend indexing & API

### Phase 2: Post-Hackathon
- [ ] Real protocol integrations (Aave, Compound)
- [ ] Multi-protocol yield optimization
- [ ] Advanced admin dashboard
- [ ] Mobile-responsive UI

### Phase 3: Production
- [ ] Cross-chain via LayerZero
- [ ] Multi-token structured products
- [ ] FTSO price oracle integration
- [ ] Security audit
- [ ] Mainnet launch

---

## 📚 Additional Documentation

All detailed docs are in the root directory:
- `HACKATHON_SIMPLIFICATION.md` - Full simplification guide
- `SIMPLIFICATION_SUMMARY.md` - Change log
- `MIGRATION_TO_FLARE.md` - Migration from Base to Flare
- `DEMO_SCRIPT.md` - Detailed demo script

---

## 🤝 Contributing

This is a hackathon project. For questions or suggestions, please open an issue.

---

## 📄 License

MIT

---

## 🏆 Built For Hackathon

**Value Proposition:**
> Liquium aggregates DeFi yield so users can deposit once and earn optimized returns across multiple protocols.

**Key Innovation:**
- Protocol-agnostic yield aggregation
- Transferable yield positions (NFTs)
- On-chain proportional distribution
- Clean, simple UX

Good luck! 🚀
