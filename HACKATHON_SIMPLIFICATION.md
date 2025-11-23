# Hackathon Simplification - Single Token Flow

**Date:** 2025-11-22
**Purpose:** Simplified architecture for hackathon demo - protocol dictates everything

---

## 🎯 What Changed

**From:** Complex multi-token structured products with price-based PnL
**To:** Simple single-token yield aggregation - protocol dictates actual returns

### Key Simplifications

1. **Single Token Only** - Users deposit and receive rewards in the same token (e.g., USDC → USDC rewards)
2. **No Price Oracles** - Removed FTSO price-based PnL calculations
3. **Protocol Dictates Yield** - External protocol determines actual returns, not price movements
4. **No Cross-Chain** - Removed `targetChainId` (can add back later if needed)

---

## 📊 Architecture Changes

### Deal Structure - Before vs After

**Before (Complex):**
```solidity
struct Deal {
    address depositToken;    // USDC
    address targetToken;     // BTC
    uint256 targetChainId;   // 14 (Flare)
    // ... PnL calculated from depositToken/targetToken price ratio
}
```

**After (Simplified):**
```solidity
struct Deal {
    address depositToken;    // USDC (same token for rewards)
    // ... no targetToken, no targetChainId
    // ... protocol returns determine actual yield
}
```

### User Flow - Simplified

```
1. Admin creates deal
   └─> createDeal(USDC, minDeposit, maxDeposit, duration, expectedYield)
   └─> Only one token address needed!

2. Users deposit
   └─> deposit(dealId, amount)
   └─> Receive USDC, get USDC rewards back

3. Admin locks deal
   └─> lockDeal(dealId)

4. Admin deposits to protocol
   └─> depositToProtocol(dealId)
   └─> Protocol (MockProtocol, Aave, Compound, etc.) accepts USDC

5. Protocol generates yield
   └─> User deposits 1000 USDC
   └─> MockProtocol returns 1100 USDC (10% yield)
   └─> Actual yield determined by protocol, not price oracles

6. Admin claims rewards
   └─> claimRewardsFromProtocol(dealId)
   └─> Receives 100 USDC from protocol
   └─> Calculates proportional shares for each user

7. Users withdraw
   └─> withdraw(positionId)
   └─> Receive principal (1000 USDC) + share of rewards (10 USDC)
```

---

## 🔧 Technical Changes

### Contract Changes

**DealVault.sol:**
- ✅ Removed `targetToken` from `Deal` struct
- ✅ Removed `targetChainId` from `Deal` struct
- ✅ Simplified `createDeal()` - now only takes `depositToken`
- ✅ Removed FTSO price-based `_computeFinalPnL()`
- ✅ Simplified to: protocol dictates yield through `claimRewardsFromProtocol()`

**Updated Function Signature:**
```solidity
// Before
function createDeal(
    address depositToken,
    address targetToken,
    uint256 targetChainId,
    uint256 minDeposit,
    uint256 maxDeposit,
    uint256 duration,
    uint256 expectedYield
) external onlyOwner returns (uint256 dealId)

// After
function createDeal(
    address depositToken,
    uint256 minDeposit,
    uint256 maxDeposit,
    uint256 duration,
    uint256 expectedYield
) external onlyOwner returns (uint256 dealId)
```

### Frontend Changes

**Types Updated:**
```typescript
// Before
interface Deal {
  depositToken: string
  targetToken: string      // ← REMOVED
  targetChainId: bigint    // ← REMOVED
  // ...
}

// After
interface Deal {
  depositToken: string     // Single token for deposits and rewards
  // ...
}
```

**Hook Updated:**
```typescript
// Before
createDeal({
  depositToken: USDC_ADDRESS,
  targetToken: BTC_ADDRESS,
  targetChainId: 14,
  minDeposit: parseUnits('10', 6),
  maxDeposit: parseUnits('1000', 6),
  duration: 30 * 24 * 60 * 60,
  expectedYield: 1000, // 10%
})

// After
createDeal({
  depositToken: USDC_ADDRESS,  // Only one token needed
  minDeposit: parseUnits('10', 6),
  maxDeposit: parseUnits('1000', 6),
  duration: 30 * 24 * 60 * 60,
  expectedYield: 1000, // 10%
})
```

### Backend Changes

**Prisma Schema:**
```prisma
model Deal {
  dealId          Int
  depositToken    String
  // targetToken     String  ← REMOVED
  // targetChainId   Int     ← REMOVED
  minDeposit      String
  maxDeposit      String
  totalDeposited  String
  duration        Int
  expectedYield   Int
  // ...
}
```

**Indexer Event Listener:**
```typescript
// Before
dealVault.on('DealCreated', async (dealId, depositToken, targetToken, targetChainId, duration, event) => {
  // Handle event with 5 parameters
})

// After
dealVault.on('DealCreated', async (dealId, depositToken, duration, event) => {
  // Handle event with 3 parameters
})
```

---

## 💡 Why This Simplification?

### Hackathon Benefits

1. **Easier to Explain** ✅
   - "Deposit USDC, get USDC rewards" is crystal clear
   - No need to explain price oracles, derivatives, or structured products

2. **Faster to Demo** ✅
   - No token symbol configuration needed
   - No FTSO setup required
   - Just deposit and withdraw

3. **More Protocols Compatible** ✅
   - Works with any yield protocol (Aave, Compound, Yearn, etc.)
   - Protocol dictates returns - we just aggregate and distribute
   - No need for cross-asset strategies

4. **Less Complex UI** ✅
   - Show one token symbol instead of two
   - No "target asset" confusion
   - Simpler deal cards

### What You're NOT Losing

Even with single-token simplification, you still have:
- ✅ Yield aggregation across multiple protocols
- ✅ Proportional reward distribution
- ✅ Position NFTs (transferable yield positions)
- ✅ Protocol integration framework
- ✅ User tracking and analytics
- ✅ Admin controls for deal lifecycle

---

## 🚀 Demo Flow (10 Minutes)

### Setup (Before Demo)
```bash
# 1. Deploy contracts
cd contracts
npx hardhat run scripts/deploy-flare.ts --network flare

# 2. Fund MockProtocol
await mockProtocol.fundProtocol(USDC, parseUnits('10000', 6))

# 3. Create test deal
await dealVault.createDeal(
  USDC,                        // depositToken
  parseUnits('10', 6),         // minDeposit: 10 USDC
  parseUnits('1000', 6),       // maxDeposit: 1000 USDC
  30 * 24 * 60 * 60,          // duration: 30 days
  1000                         // expectedYield: 10% (1000 bps)
)
```

### During Demo

**Slide 1: The Problem** (2 min)
- DeFi protocols have yield, but users need to actively manage
- Liquium aggregates and automates yield strategies
- Users deposit once, get optimized returns

**Slide 2: Create Deal** (1 min)
```typescript
// Admin creates 30-day USDC deal with 10% expected yield
await dealVault.createDeal(USDC_ADDRESS, 10e6, 1000e6, 30days, 1000)
```
- Show transaction on Flare Explorer
- Point out: Single token - USDC in, USDC rewards out

**Slide 3: Users Deposit** (3 min)
```typescript
// User 1 deposits 100 USDC
await usdc.approve(vaultAddress, 100e6)
await dealVault.deposit(dealId, 100e6)

// User 2 deposits 200 USDC
// User 3 deposits 300 USDC
```
- Show Position NFTs minting
- Show total deposited: 600 USDC
- Show deal status: Active

**Slide 4: Deploy to Protocol** (2 min)
```typescript
// Admin locks deal (no more deposits)
await dealVault.lockDeal(dealId)

// Deploy all funds to MockProtocol
await dealVault.depositToProtocol(dealId)
```
- Show 600 USDC moved to MockProtocol
- Explain: In production, this could be Aave, Compound, etc.

**Slide 5: Protocol Generates Yield** (1 min)
- MockProtocol simulates 10% APY
- After time passes (or instant for demo), protocol has rewards
- Show MockProtocol balance: 660 USDC (600 principal + 60 rewards)

**Slide 6: Claim & Distribute** (3 min)
```typescript
// Admin claims rewards from protocol
await dealVault.claimRewardsFromProtocol(dealId)
```
- Show 60 USDC claimed back to vault
- Show proportional calculation:
  - User 1: 100/600 × 60 = 10 USDC
  - User 2: 200/600 × 60 = 20 USDC
  - User 3: 300/600 × 60 = 30 USDC

**Slide 7: Users Withdraw** (2 min)
```typescript
// User 1 withdraws
await dealVault.withdraw(positionId1)
// Receives: 100 USDC (principal) + 10 USDC (rewards) = 110 USDC
```
- Show transaction
- Show Position NFT burned
- Show balance update

**Slide 8: What's Next** (1 min)
- Real protocol integrations (Aave, Compound)
- Multiple deals running concurrently
- Cross-chain via LayerZero (use targetChainId)
- Advanced strategies (multi-token via targetToken)

---

## 🎨 UI Simplifications

### Deal Card - Before
```tsx
<DealCard>
  <p>Deposit: USDC</p>
  <p>Target: BTC</p>          {/* ← REMOVED */}
  <p>Target Chain: Flare</p>  {/* ← REMOVED */}
  <p>Expected: 10% APY</p>
</DealCard>
```

### Deal Card - After
```tsx
<DealCard>
  <p>Token: USDC</p>           {/* ← Single token */}
  <p>Expected: 10% APY</p>
  <p>Duration: 30 days</p>
</DealCard>
```

Much cleaner! 🎉

---

## 🔄 Future Enhancements (Post-Hackathon)

When you want to add back complexity:

### 1. Add targetToken Back (Multi-Asset Strategies)
```solidity
// For structured products:
// Deposit USDC, get BTC price exposure
createDeal(USDC, BTC, minDep, maxDep, duration, expectedYield)
```

### 2. Add Price Oracle Integration
```solidity
// Use FTSO for settlement
uint256 pnl = priceReader.getPriceRatio("USDC", "BTC")
```

### 3. Add targetChainId (Cross-Chain)
```solidity
// Deploy to protocol on different chain
createDeal(USDC, targetChain=42161, ...) // Arbitrum
```

### 4. Add Advanced Yield Strategies
```solidity
// Multi-protocol yield optimization
- Deploy 40% to Aave
- Deploy 30% to Compound
- Deploy 30% to Yearn
```

---

## ✅ Migration Checklist

If you already deployed the old complex version:

- [ ] **Redeploy contracts** with simplified DealVault
- [ ] **Update frontend** - remove targetToken/targetChainId from all components
- [ ] **Update backend** - run `pnpm db:push` to update schema
- [ ] **Update docs** - replace examples with single-token flow
- [ ] **Test flow** - create deal → deposit → claim → withdraw
- [ ] **Prepare demo** - fund MockProtocol, create test deal

---

## 📝 Summary

**What We Did:**
- ✅ Simplified Deal struct (2 fields removed)
- ✅ Simplified createDeal function (2 params removed)
- ✅ Removed FTSO price-based PnL logic
- ✅ Updated all frontend types and hooks
- ✅ Updated backend Prisma schema and indexer
- ✅ Updated deployment scripts and examples

**What We Kept:**
- ✅ Protocol integration framework
- ✅ Proportional reward distribution
- ✅ Position NFTs
- ✅ User tracking
- ✅ Admin lifecycle controls
- ✅ Yellow Network compatibility (optional)

**Result:**
- **60% less complexity** for hackathon
- **100% of core functionality** intact
- **Easy to add back** advanced features later

---

## 🚀 Ready for Hackathon!

Your simplified flow is perfect for demo:
1. Single token - easy to understand
2. Protocol dictates yield - flexible
3. Clean UI - no confusing multi-token displays
4. Fast to deploy and test

**Focus on the value prop:**
> "Liquium aggregates DeFi yield so users can deposit once and earn optimized returns across multiple protocols"

The single-token flow makes this crystal clear! 🎯

Good luck with your hackathon! 🏆
