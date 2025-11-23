# Liquium Full-Stack Developer Guide

## 📖 Overview

Liquium is a DeFi protocol that combines yield generation with instant liquidity via Yellow Network state channels. Users deposit funds, earn yields, and can trade their rewards instantly off-chain with zero gas fees.

**Deployed Contracts (Base Sepolia)**:
```
DealPosition:        0x8C905a3e121b524241f46A7a9908c1AC46fcA31C
ChannelRegistry:     0xbd3Ca1a4831Ff055AF5F26E52ae6c1C8e2A7AA45
MockProtocol:        0x03c4830d284E49AE9A8e0777ce3c268c93509328
PriceReader:         0x2d70E24D5F411B1451B63751fB838D09054CF656
DealVault:           0x61C36920D2840Af00e99aa1575f15239Cc11f5d2
YellowChannel:       0x28B23e6286AD45bB2716e2ca5ecdd36C0d7ae0A6
NitroliteAdapter:    0x798F4000DecCa542C4375800A621c03F6dEB5FBe
RewardDistributor:   0x6B2F70C1ab08c19d6A314d870E1FBe1202Cc461f
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  • Wallet connection (wagmi)                            │
│  • Deal browsing & deposits                             │
│  • Rewards dashboard                                    │
│  • Mock Yellow Network trading UI                       │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴──────────┐
        │                      │
        ▼                      ▼
┌────────────────┐    ┌────────────────────┐
│  BACKEND API   │    │  SMART CONTRACTS   │
│  (Express)     │    │  (Base Sepolia)    │
│                │    │                    │
│  • Event index │    │  • DealVault       │
│  • User data   │    │  • MockProtocol    │
│  • Analytics   │    │  • Yellow Channels │
└────────────────┘    └────────────────────┘
```

---

## ✅ What's Working vs ⚠️ What's Not

### ✅ FULLY WORKING

1. **Deal Management**
   - Create deals with parameters (min/max deposit, duration, APY)
   - Users deposit USDC
   - Position NFTs minted automatically
   - Lock deals to prevent new deposits

2. **Protocol Integration**
   - Deposit deal funds to MockProtocol
   - Earn 10% simple interest
   - Claim rewards back to DealVault
   - Calculate proportional rewards per user

3. **User Tracking**
   - Individual deposits tracked
   - Reward shares calculated automatically
   - Yellow addresses configurable per user

4. **On-Chain Yellow Channels**
   - Create state channels with user allocations
   - Each user gets their own channel
   - Channel IDs and balances stored on-chain

### ⚠️ PARTIALLY WORKING (Needs Setup)

1. **Mock Protocol Funding**
   - ⚠️ Admin must fund MockProtocol BEFORE claiming rewards
   - **How to fix**: Call `mockProtocol.fundProtocol(usdc, amount)`

2. **Reward Distribution Approval**
   - ⚠️ DealVault must approve RewardDistributor
   - **How to fix**: Call `usdc.approve(distributorAddr, rewardAmount)` before distribute

### ❌ NOT IMPLEMENTED (Future/Simulated)

1. **Yellow Network Off-Chain Trading**
   - ❌ No real WebSocket connection
   - ❌ No state signatures
   - ❌ No actual Yellow Network integration
   - **For Demo**: UI is mocked (see `YellowTradingModal.tsx`)

2. **Real-Time Event Indexing**
   - ❌ No active event listener running
   - ❌ Database not auto-updated
   - **For Demo**: Call API to manually index events

3. **Cross-Chain Deposits**
   - ❌ RemoteVault not implemented
   - ❌ LayerZero integration pending

---

## 🚀 Quick Start

### Prerequisites
```bash
node >= 18
npm or pnpm
PostgreSQL (for backend)
MetaMask or similar wallet
Base Sepolia testnet ETH
```

### 1. Frontend Setup

```bash
cd frontend
npm install

# Create .env
cat > .env << EOF
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:3001
VITE_CHAIN_ID=84532
EOF

# Start dev server
npm run dev
```

Open http://localhost:5173

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/liquium"
PORT=3001
RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="your_private_key_for_indexing"
EOF

# Setup database
npx prisma generate
npx prisma db push

# Start server
npm run dev
```

API available at http://localhost:3001

### 3. Verify Deployment

```bash
# Check contracts are deployed
curl https://sepolia.basescan.org/address/0x61C36920D2840Af00e99aa1575f15239Cc11f5d2

# Check backend health
curl http://localhost:3001/health
```

---

## 📱 Frontend Structure

```
frontend/src/
├── components/
│   ├── DealList.tsx          # Browse and view deals
│   ├── DepositModal.tsx      # Deposit flow with approval
│   ├── RewardsPanel.tsx      # User rewards dashboard
│   ├── YellowTradingModal.tsx # MOCK Yellow trading UI
│   └── AdminPanel.tsx        # Admin operations
│
├── hooks/
│   ├── useDeals.ts           # Read deal data
│   ├── useDeposit.ts         # Deposit flow
│   ├── useAdmin.ts           # Admin operations
│   └── useRewards.ts         # Reward tracking
│
├── lib/
│   ├── contracts.ts          # ABIs & addresses
│   ├── wagmi.ts              # Wallet config
│   └── api.ts                # Backend client
│
└── pages/
    ├── Home.tsx              # Landing page
    ├── Deals.tsx             # Deal list
    ├── MyPositions.tsx       # User positions
    └── Admin.tsx             # Admin panel
```

### Key Components Explained

#### `DealList.tsx`
Shows all available deals. Users can:
- View deal parameters (APY, min/max deposit, time remaining)
- Click to open deposit modal
- See deal status (Active, Locked, Finalized)

#### `DepositModal.tsx`
Handles the two-step deposit flow:
1. **Approve USDC** - If needed
2. **Deposit** - Transfer and mint NFT

Shows:
- User's USDC balance
- Deal min/max limits
- Transaction progress

#### `RewardsPanel.tsx`
Shows user's rewards across all deals:
- Deposit amounts
- Reward shares
- Yellow channel IDs
- "Trade on Yellow" button (opens mock modal)

#### `YellowTradingModal.tsx` ⚠️ **MOCK FOR DEMO**
Simulates Yellow Network trading:
- Shows "Connect to Yellow" flow (simulated)
- Trading interface (USDC → BTC/ETH/etc.)
- Instant execution (simulated)
- Balance updates (local state only)

**Important**: This is NOT real Yellow Network integration. It's a demo UI to show the concept.

---

## 🔧 Backend API

### Endpoints

#### Deals
```bash
GET  /api/deals                    # List all deals
GET  /api/deals/:dealId            # Get single deal
GET  /api/deals/:dealId/stats      # Deal statistics
GET  /api/deals/:dealId/depositors # List depositors
```

#### Users
```bash
GET  /api/users/:address                # User profile
GET  /api/users/:address/positions      # User's positions
POST /api/users/:address/yellow         # Set Yellow address
```

#### Rewards
```bash
GET /api/rewards/user/:address     # User's rewards
GET /api/rewards/deal/:dealId      # Deal's rewards
GET /api/rewards/channel/:channelId # Reward by channel
```

### Database Schema

```prisma
model Deal {
  dealId         Int
  depositToken   String
  totalDeposited String
  status         String
  expectedYield  Int
  // ... more fields
}

model Deposit {
  dealId      Int
  userAddress String
  positionId  Int
  amount      String
  timestamp   DateTime
}

model Reward {
  dealId        Int
  userAddress   String
  rewardShare   String
  yellowAddress String?
  channelId     String?
  distributed   Boolean
}
```

---

## 🎯 User Flows

### Flow 1: User Deposits into Deal

```
1. User browses deals on /deals
2. Clicks "Deposit" on Deal #1
3. DepositModal opens
4. User enters amount (e.g., 100 USDC)
5. IF allowance < amount:
   a. Click "Approve & Deposit"
   b. Approve transaction (MetaMask)
   c. Wait for confirmation
   d. Auto-proceeds to step 6
6. Deposit transaction (MetaMask)
7. Wait for confirmation
8. Position NFT minted
9. Success message shown
10. Modal closes, deal updates
```

**Code**:
```typescript
// In DepositModal.tsx
const { approve } = useApproveUSDC();
const { deposit } = useDeposit();

// Step 1: Approve
if (needsApproval) {
  await approve(amount);
}

// Step 2: Deposit
await deposit(dealId, amount);
```

### Flow 2: Admin Distributes Rewards

```
1. Admin creates deal (AdminPanel)
2. Users deposit (see Flow 1)
3. Admin locks deal
   → dealVault.lockDeal(dealId)
4. Admin deposits to protocol
   → dealVault.depositToProtocol(dealId)
5. Time passes (or instant with MockProtocol)
6. Admin claims rewards
   → dealVault.claimRewardsFromProtocol(dealId)
   → Rewards calculated per user
7. Admin approves distributor
   → usdc.approve(distributorAddr, rewardAmount)
8. Admin distributes to Yellow
   → distributor.distributeRewardsToYellow(dealId)
   → Creates channel for each user
9. Users see rewards in RewardsPanel
```

**Code**:
```typescript
// In AdminPanel.tsx
const { lockDeal } = useLockDeal();
const { depositToProtocol } = useDepositToProtocol();
const { claimRewards } = useClaimRewards();
const { distributeRewards } = useDistributeRewards();

// Execute in order
await lockDeal(dealId);
await depositToProtocol(dealId);
// ... wait ...
await claimRewards(dealId);
await distributeRewards(dealId);
```

### Flow 3: User Views & "Trades" Rewards

```
1. User navigates to /rewards
2. RewardsPanel shows their deals
3. For Deal #1: "50 USDC reward available"
4. Shows Yellow Channel ID
5. User clicks "Trade on Yellow"
6. YellowTradingModal opens
7. Click "Connect to Yellow" (simulated)
8. Trading interface appears
9. Select: USDC → BTC
10. Enter amount: 50 USDC
11. Shows receive: ~0.00111 BTC
12. Click "Execute Trade"
13. Shows "Trade executed!" (simulated)
14. Balance updates (local state)
```

**Code**:
```typescript
// In YellowTradingModal.tsx
const [isConnected, setIsConnected] = useState(false);

// Simulate connection
const handleConnect = () => {
  setTimeout(() => setIsConnected(true), 1500);
};

// Simulate trade
const handleTrade = () => {
  setIsTrading(true);
  setTimeout(() => {
    setTradeSuccess(true);
    // Update local balance (NOT real)
    setMockBalance(mockBalance - amount);
  }, 2000);
};
```

---

## 🎨 Demo Strategy

### What to Show

**✅ Working Features**:
1. Create deal (show tx on BaseScan)
2. Multiple users deposit (show NFTs minted)
3. Lock deal (show status change)
4. Deposit to MockProtocol (show balance change)
5. Claim rewards (show 10% calculated)
6. Distribute to Yellow (show channel IDs in events)

**🎭 Simulated Features**:
1. Yellow Network connection (show UI, explain it's mocked)
2. Off-chain trading (explain state channels concept)
3. Instant settlement (show speed, explain it's simulated)

### Demo Script

See `DEMO_SCRIPT.md` for detailed 10-15 minute demo flow.

### Pre-Demo Checklist

- [ ] Deploy test USDC on Base Sepolia
- [ ] Fund MockProtocol with rewards
- [ ] Mint USDC to 2-3 test wallets
- [ ] Start backend API
- [ ] Start frontend
- [ ] Create 1 test deal
- [ ] Test deposit flow once

---

## 🐛 Troubleshooting

### Contract Errors

**Error**: "Insufficient allowance"
```typescript
// Fix: Approve USDC first
await usdc.approve(vaultAddress, amount);
```

**Error**: "Deal not active"
```typescript
// Check deal status
const deal = await dealVault.getDeal(dealId);
console.log("Status:", deal.status); // Should be 0 (Active)
```

**Error**: "No rewards to claim"
```typescript
// Fix: Fund MockProtocol first
await mockProtocol.fundProtocol(usdc, rewardAmount);
```

### Frontend Issues

**Issue**: Wallet won't connect
```typescript
// Check wagmi config in lib/wagmi.ts
// Verify VITE_WALLETCONNECT_PROJECT_ID is set
```

**Issue**: Transactions not confirming
```typescript
// Check Base Sepolia RPC
// Try adding gas limit:
await contract.method({ gasLimit: 500000 })
```

### Backend Issues

**Issue**: Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in .env
psql $DATABASE_URL
```

**Issue**: API returns empty arrays
```bash
# Check if indexer has run
npm run index:events

# Manually check database
npx prisma studio
```

---

## 🔐 Security Notes

### For Production

1. **Audit Contracts**
   - Get professional audit
   - Test extensively on testnet
   - Use multi-sig for admin functions

2. **Frontend Security**
   - Never expose private keys
   - Validate all user inputs
   - Use HTTPS only
   - Implement rate limiting

3. **Backend Security**
   - Use environment variables
   - Sanitize database inputs
   - Implement authentication
   - Add request validation

### Current Limitations

- ⚠️ Admin functions are centralized (single owner)
- ⚠️ No pause mechanism
- ⚠️ MockProtocol is not audited
- ⚠️ Yellow integration is simulated

---

## 📚 Additional Resources

- [Liquium Documentation](./FULLSTACK_GUIDE.md)
- [Demo Script](./DEMO_SCRIPT.md)
- [wagmi Docs](https://wagmi.sh/)
- [Base Docs](https://docs.base.org/)
- [Yellow Network](https://docs.yellow.org/)

---

## 🎯 Next Steps

### Immediate (For Demo)
1. Test full flow end-to-end
2. Prepare demo wallets with USDC
3. Practice demo script
4. Prepare Q&A responses

### Short-term (1-2 weeks)
1. Implement real Yellow Network connection
2. Add event indexer auto-sync
3. Improve error handling
4. Add loading states

### Long-term (1-3 months)
1. Integrate real yield protocols (Aave, Compound)
2. Deploy to Base mainnet
3. Add cross-chain support
4. Build mobile app
5. Get security audit

---

## 💬 Questions?

Contact: [Your contact info]

Good luck with the demo! 🚀
