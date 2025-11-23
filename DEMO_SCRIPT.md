# Liquium PoC Demo Script

## 🎯 Demo Flow (10-15 minutes)

This script shows the complete Liquium flow from deal creation to Yellow Network reward distribution.

---

## Pre-Demo Setup (Do this BEFORE the demo)

### 1. Deploy Test USDC Token

```bash
# In contracts directory
npx hardhat run scripts/deploy-test-usdc.ts --network baseSepolia
```

Save the USDC address to `.env`:
```
TEST_USDC_ADDRESS=0x...
```

### 2. Fund MockProtocol

The MockProtocol needs tokens to pay rewards. Fund it with 10% of expected deposits.

```bash
# If you expect 1000 USDC in deposits, fund with 100 USDC
```

```javascript
// Using ethers in a script
const mockProtocol = await ethers.getContractAt("MockProtocol", MOCK_PROTOCOL_ADDRESS);
await usdc.approve(mockProtocol.address, ethers.parseUnits("100", 6));
await mockProtocol.fundProtocol(usdcAddress, ethers.parseUnits("100", 6));
```

### 3. Mint Test USDC to Demo Wallets

Mint USDC to 2-3 test wallets for demo depositors:

```javascript
// Assuming you deployed a mintable test USDC
await testUsdc.mint(wallet1.address, ethers.parseUnits("1000", 6));
await testUsdc.mint(wallet2.address, ethers.parseUnits("500", 6));
await testUsdc.mint(wallet3.address, ethers.parseUnits("500", 6));
```

### 4. Start Backend API

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🎬 Live Demo Script

### PART 1: Deal Creation (2 min)

**Narration**: "Let's create a new investment deal on Liquium. This deal offers 10% APY and accepts deposits from 10 to 1000 USDC."

**Actions**:
1. Connect wallet (admin wallet)
2. Navigate to Admin Panel
3. Click "Create Deal"
4. Fill in:
   - Min Deposit: 10 USDC
   - Max Deposit: 1000 USDC
   - Duration: 1 day (for demo - use 5 minutes for faster demo)
   - Expected Yield: 10%
5. Click "Create Deal"
6. Wait for transaction confirmation

**Expected Result**: Deal #1 created, visible in Active Deals

---

### PART 2: User Deposits (3 min)

**Narration**: "Now let's see users depositing into this deal. Three different users will deposit USDC."

**Actions**:
1. Switch to User Wallet 1
2. Navigate to Deals page
3. Click on Deal #1
4. Enter amount: 500 USDC
5. Click "Approve & Deposit"
6. Confirm both transactions (approve + deposit)
7. Show Position NFT received

**Repeat for 2 more wallets with different amounts**

**Expected Result**:
- Deal shows total deposited: ~1500 USDC
- Each user has a Position NFT
- Users appear in "Depositors" list

---

### PART 3: Lock Deal & Deploy to Protocol (2 min)

**Narration**: "Once we have enough deposits, the admin locks the deal and deploys funds to our yield-generating protocol."

**Actions**:
1. Switch to Admin Wallet
2. In Admin Panel, find Deal #1
3. Click "Lock Deal"
4. Wait for confirmation
5. Click "→ Protocol" (Deposit to Protocol)
6. Confirm transaction

**Expected Result**:
- Deal status changes to "Locked"
- Funds are now in MockProtocol
- Show MockProtocol balance increased

---

### PART 4: Time Passes / Fast Forward (1 min)

**Narration**: "In a real scenario, time would pass while the protocol generates yield. For this demo, our MockProtocol instantly provides 10% returns."

**Actions**:
- Show MockProtocol stats
- Explain that 10% rewards are ready to claim
- Show calculation: 1500 USDC deposited → 150 USDC rewards

---

### PART 5: Claim Rewards (2 min)

**Narration**: "Now the admin claims the rewards from the protocol. These will be distributed proportionally to all depositors."

**Actions**:
1. In Admin Panel, click "Claim Rewards"
2. Confirm transaction
3. Wait for confirmation
4. Show RewardsClaimedFromProtocol event
5. Navigate to backend API: `/api/rewards/deal/1`
6. Show each user's calculated reward share

**Expected Result**:
- 150 USDC claimed
- User 1 (500 USDC deposit) → 50 USDC reward
- User 2 (500 USDC deposit) → 50 USDC reward
- User 3 (500 USDC deposit) → 50 USDC reward

---

### PART 6: Distribute to Yellow Network (3 min)

**Narration**: "Finally, we distribute these rewards to Yellow Network channels. Each user gets their own state channel where they can trade instantly."

**Actions**:
1. Admin approves RewardDistributor to spend USDC
   - Amount: 150 USDC (total rewards)
2. Click "⚡ Distribute"
3. Confirm transaction
4. Wait for RewardsDistributed event
5. Show event logs:
   - 3 channels created
   - Each with corresponding reward amount

**Expected Result**:
- 3 Yellow channels created
- Each user has a channel with their reward balance
- Show channel IDs in events

---

### PART 7: User Views & "Trades" Rewards (2-3 min)

**Narration**: "Now let's see what users see. They can view their rewards in Yellow Network channels and trade them instantly."

**Actions**:
1. Switch to User Wallet 1
2. Navigate to "My Rewards"
3. See Deal #1 with reward share: 50 USDC
4. See Yellow Channel ID
5. Click "Trade on Yellow Network"

**MOCK Yellow Network Demo**:
1. Modal shows "Connect to Yellow Network"
2. Click Connect (simulated)
3. Shows "Connected" badge
4. Trading interface appears:
   - From: USDC
   - To: BTC
   - Amount: Enter 50 USDC
   - Receive: ~0.00111 BTC
5. Click "Execute Trade"
6. Shows "Trade executed instantly!"
7. Balance updates (simulated)

**Narration**: "This is a simulation of Yellow Network. In production, this would be a real WebSocket connection to Yellow nodes, and trades would execute off-chain via state channels with instant finality and zero gas fees."

---

## 💡 Key Points to Emphasize

### What's Real (Working on Base Sepolia):
- ✅ Smart contracts deployed and verified
- ✅ Deal creation and user deposits
- ✅ MockProtocol yields 10% rewards
- ✅ Proportional reward calculation
- ✅ Yellow channel creation on-chain
- ✅ Position NFTs (tradeable on OpenSea)

### What's Simulated (For Demo):
- ⚠️ Yellow Network connection (requires their infrastructure)
- ⚠️ Off-chain trading (would need WebSocket + state signatures)
- ⚠️ Real-time balance updates (would come from Yellow nodes)

### Why This Architecture Matters:
1. **Yields Made Accessible**: Users can earn yield and immediately trade rewards
2. **Zero Gas Fees**: Yellow Network trading is off-chain
3. **Instant Settlement**: State channels provide sub-second finality
4. **Capital Efficient**: Rewards aren't locked, can be traded immediately
5. **Composable**: Works with any yield protocol (Aave, Compound, etc.)

---

## 🎨 Demo Enhancements (Optional)

### Add Live Charts
- Show TVL chart
- User deposit breakdown
- Reward distribution timeline

### Add Notifications
- WebSocket connection to backend
- Real-time deposit notifications
- Reward distribution alerts

### Add Mobile View
- Show responsive design
- Test on mobile device

---

## 🐛 Common Issues & Solutions

### Issue: MockProtocol has insufficient balance
**Solution**: Fund MockProtocol before claiming rewards
```javascript
await mockProtocol.fundProtocol(usdc, ethers.parseUnits("200", 6));
```

### Issue: RewardDistributor approval fails
**Solution**: Make sure to approve BEFORE distributing
```javascript
await usdc.approve(REWARD_DISTRIBUTOR, rewardAmount);
```

### Issue: Yellow channel creation fails
**Solution**: Check that DealVault has enough USDC balance for all channels

### Issue: Users can't see their rewards
**Solution**: Make sure backend indexer is running and synced

---

## 📊 Success Metrics

After demo, show:
- ✅ 3 users deposited
- ✅ 1500 USDC TVL
- ✅ 150 USDC rewards distributed
- ✅ 3 Yellow channels created
- ✅ 0 gas fees for trading (simulated)

---

## 🎯 Next Steps Discussion

After demo:
1. **Production Yellow Integration**
   - Connect to real Yellow Network nodes
   - Implement WebSocket state synchronization
   - Add dual-signature validation

2. **Real Protocols**
   - Integrate Aave on Base
   - Add Compound
   - Support multiple protocols

3. **Cross-Chain**
   - Deploy RemoteVaults on Arbitrum, Optimism
   - Implement LayerZero messaging
   - Unified liquidity across chains

4. **Analytics Dashboard**
   - Historical APY tracking
   - User analytics
   - Protocol performance metrics

---

## 📞 Q&A Prep

**Q: Is this live on mainnet?**
A: Currently on Base Sepolia testnet. Mainnet deployment ready, pending audits.

**Q: Does Yellow Network actually work?**
A: The on-chain part (channel creation) works. Full integration requires Yellow Network infrastructure which is in progress.

**Q: What about security?**
A: Contracts follow OpenZeppelin patterns, use ReentrancyGuard, SafeERC20. Production requires full audit.

**Q: How do you make money?**
A: 1% protocol fee on yields. At scale, this is significant.

**Q: What's your competitive advantage?**
A: We're the only protocol combining yield aggregation with instant liquidity via state channels.

---

Ready to demo! 🚀
