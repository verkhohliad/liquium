# Liquium - System Architecture

## Architecture Overview

Liquium follows a **three-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│              (Next.js 15 + React + wagmi)               │
└────────────────────┬───────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼───────────────────────────────────┐
│                    Backend Layer                         │
│         (Node.js + TypeScript + Services)               │
└────┬───────────────┬───────────────┬───────────────────┘
     │               │               │
     │ RPC           │ SDK           │ API
     │               │               │
┌────▼───────┐ ┌────▼────────┐ ┌───▼──────────────┐
│   Flare    │ │   Yellow     │ │   LayerZero     │
│  Contracts │ │   Nitrolite  │ │   & 1inch       │
│  + FTSO    │ │   Channels   │ │   Integration   │
└────────────┘ └──────────────┘ └─────────────────┘
```

## Component Architecture

### Layer 1: Smart Contracts (On-Chain)

#### Flare Network Contracts

```
contracts/
├── core/
│   ├── DealFactory.sol
│   │   └── Creates and tracks all DealVault instances
│   ├── DealVault.sol
│   │   └── Holds LP deposits, manages deal lifecycle
│   ├── DealPosition.sol (ERC-721)
│   │   └── Represents LP positions as NFTs
│   └── ChannelRegistry.sol
│       └── Maps dealId → channelId for Yellow channels
│
├── integrations/
│   ├── flare/
│   │   ├── FlarePriceReader.sol
│   │   │   └── Queries FTSO v2 for price feeds
│   │   └── FlareRandomConsumer.sol
│   │       └── Consumes Secure Random (optional)
│   │
│   ├── yellow/
│   │   └── NitroliteAdapter.sol
│   │       └── Interfaces with ERC-7824 contracts
│   │
│   └── layerzero/
│       ├── DealMessenger.sol (OApp)
│       │   └── Sends cross-chain messages
│       └── interfaces/
│           └── IDealMessenger.sol
│
└── external/ (imported)
    └── @erc7824/contracts/
        ├── AssetHolder.sol
        └── Adjudicator.sol
```

#### Remote Chain Contracts (Base Sepolia)

```
contracts-remote/
└── crosschain/
    └── RemoteAccounting.sol (OApp)
        └── Receives deal settlement messages
```

#### Contract Interaction Flow

```
DealFactory
    │
    ├─creates──> DealVault (1 per deal)
    │                │
    │                ├─holds─> USDC (deposits)
    │                │
    │                ├─mints─> DealPosition NFTs
    │                │
    │                └─reads─> ChannelRegistry
    │                           └─links to─> Yellow Channel
    │
    ├─references─> FlarePriceReader
    │                   └─queries─> FTSO v2
    │
    └─emits──> Events ──listened by──> Backend
```

### Layer 2: Backend Services (Off-Chain Orchestration)

```
backend/
├── src/
│   ├── index.ts
│   │   └── Main entry point, service initialization
│   │
│   ├── config.ts
│   │   └── Environment config, network params
│   │
│   ├── services/
│   │   ├── blockchain/
│   │   │   ├── flareClient.ts
│   │   │   │   └── viem wrapper for Flare RPC
│   │   │   ├── ftsoService.ts
│   │   │   │   └── FTSO price feed queries
│   │   │   └── eventListener.ts
│   │   │       └── Contract event monitoring
│   │   │
│   │   ├── channels/
│   │   │   ├── nitroliteClient.ts
│   │   │   │   └── Yellow SDK wrapper
│   │   │   └── channelManager.ts
│   │   │       └── Channel state tracking
│   │   │
│   │   ├── crosschain/
│   │   │   ├── layerzeroClient.ts
│   │   │   │   └── LZ message sending
│   │   │   └── messageTracker.ts
│   │   │       └── Cross-chain status
│   │   │
│   │   └── defi/
│   │       ├── oneInchClient.ts
│   │       │   └── 1inch API integration
│   │       └── routeOptimizer.ts
│   │           └── Swap route calculations
│   │
│   ├── workflows/
│   │   ├── dealOrchestrator.ts
│   │   │   └── Main deal lifecycle coordinator
│   │   ├── createDeal.ts
│   │   ├── lockDeal.ts
│   │   ├── executeDeal.ts
│   │   └── settleDeal.ts
│   │
│   └── cli/
│       └── commands/
│           ├── create.ts
│           ├── lock.ts
│           ├── settle.ts
│           └── query.ts
```

#### Service Architecture

```
┌──────────────────────────────────────────────────┐
│            DealOrchestrator                       │
│  (Coordinates all services)                       │
└───┬────────┬────────────┬────────────┬──────────┘
    │        │            │            │
    ▼        ▼            ▼            ▼
┌───────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│ Flare │ │ Yellow  │ │LayerZero │ │  1inch   │
│Client │ │ Client  │ │ Client   │ │  Client  │
└───────┘ └─────────┘ └──────────┘ └──────────┘
    │         │             │            │
    ▼         ▼             ▼            ▼
  RPC     WebSocket       RPC        REST API
```

#### Service Responsibilities

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| **FlareClient** | RPC interactions, contract calls | viem, contract ABIs |
| **FTSOService** | Price feed queries | FlareClient |
| **EventListener** | Monitor contract events | FlareClient |
| **NitroliteClient** | Channel operations | @erc7824/nitrolite |
| **ChannelManager** | State tracking, persistence | NitroliteClient |
| **LayerZeroClient** | Cross-chain messages | FlareClient, viem |
| **MessageTracker** | Message status | LayerZeroClient |
| **OneInchClient** | Swap quotes | axios, 1inch API |
| **RouteOptimizer** | Route analysis | OneInchClient |
| **DealOrchestrator** | Workflow coordination | All services |

### Layer 3: Frontend Application

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing page
│   │   │
│   │   ├── deals/
│   │   │   ├── page.tsx       # Deals list
│   │   │   └── [id]/
│   │   │       ├── page.tsx   # Deal detail
│   │   │       └── components/
│   │   │           ├── DealHeader.tsx
│   │   │           ├── StrategyView.tsx
│   │   │           ├── DepositForm.tsx
│   │   │           ├── ClaimPanel.tsx
│   │   │           └── PriceChart.tsx
│   │   │
│   │   ├── positions/
│   │   │   └── page.tsx       # LP positions
│   │   │
│   │   └── analytics/
│   │       └── page.tsx       # Octav analytics
│   │
│   ├── components/            # Shared components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   ├── deals/
│   │   │   ├── DealCard.tsx
│   │   │   ├── DealList.tsx
│   │   │   └── DealFilters.tsx
│   │   │
│   │   ├── positions/
│   │   │   └── PositionCard.tsx
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── ErrorAlert.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   └── lib/                   # Utilities & hooks
│       ├── contracts/
│       │   ├── dealVault.ts   # Contract ABIs + hooks
│       │   ├── dealFactory.ts
│       │   └── dealMessenger.ts
│       │
│       ├── providers/
│       │   ├── web3.tsx       # Wagmi + RainbowKit
│       │   └── query.tsx      # TanStack Query
│       │
│       ├── hooks/
│       │   ├── useDealVault.ts
│       │   ├── useDeposit.ts
│       │   ├── useClaim.ts
│       │   ├── useFTSOPrice.ts
│       │   └── useLayerZeroStatus.ts
│       │
│       └── api/
│           ├── backend.ts     # Backend API client
│           ├── oneInch.ts     # 1inch API client
│           └── octav.ts       # Octav API client
```

## Data Flow Architecture

### Deal Creation Flow

```
┌─────────┐
│  Admin  │
└────┬────┘
     │ 1. CLI command: create-deal
     ▼
┌──────────────┐
│   Backend    │
└──────┬───────┘
       │ 2. Call DealFactory.createDeal()
       ▼
┌──────────────────┐
│ DealFactory.sol  │
└──────┬───────────┘
       │ 3. Deploy new DealVault
       ▼
┌──────────────────┐
│  DealVault.sol   │
│  Status: Open    │
└──────┬───────────┘
       │ 4. Emit DealCreated event
       ▼
┌──────────────┐
│ EventListener│
└──────┬───────┘
       │ 5. Store in database
       ▼
┌──────────────┐
│   Frontend   │ 6. Display in UI
└──────────────┘
```

### Deposit Flow

```
┌──────┐
│  LP  │ Connects wallet via RainbowKit
└──┬───┘
   │ 1. Approve USDC
   ▼
┌─────────────────┐
│ Frontend        │
│ (DepositForm)   │
└──────┬──────────┘
       │ 2. Call deposit()
       ▼
┌──────────────────┐
│  DealVault.sol   │
└──────┬───────────┘
       │ 3. Transfer USDC
       │ 4. Mint Position NFT
       ▼
┌──────────────────┐
│ DealPosition.sol │
└──────┬───────────┘
       │ 5. Emit Deposited event
       ▼
┌──────────────┐
│   Frontend   │ 6. Show success + NFT
└──────────────┘
```

### Channel Execution Flow

```
┌─────────┐
│  Admin  │ Locks deal
└────┬────┘
     │ 1. Call lock()
     ▼
┌──────────────────┐
│  DealVault.sol   │
│  Status: Locked  │
└──────┬───────────┘
       │ 2. Emit DealLocked
       ▼
┌───────────────────┐
│  EventListener    │
└──────┬────────────┘
       │ 3. Trigger workflow
       ▼
┌───────────────────┐
│ DealOrchestrator  │
└──────┬────────────┘
       │ 4. Open Nitrolite channel
       ▼
┌───────────────────┐
│  NitroliteClient  │
└──────┬────────────┘
       │ 5. Call openChannel()
       ▼
┌───────────────────┐
│   Yellow Node     │
└──────┬────────────┘
       │ 6. Return channelId
       ▼
┌───────────────────┐
│ ChannelRegistry   │ 7. Store mapping
│ dealId→channelId  │
└──────┬────────────┘
       │
       │ 8. Deposit to AssetHolder
       ▼
┌───────────────────┐
│  AssetHolder.sol  │ Holds LP capital
└───────────────────┘

Loop: Strategy Execution
┌───────────────────┐
│ DealOrchestrator  │
└──────┬────────────┘
       │ 1. Query FTSO price
       ▼
┌───────────────────┐
│  FTSOService      │
└──────┬────────────┘
       │ 2. Get current price
       ▼
┌───────────────────┐
│ FTSO v2 Contract  │
└──────┬────────────┘
       │ 3. Return price + timestamp
       ▼
┌───────────────────┐
│ DealOrchestrator  │
└──────┬────────────┘
       │ 4. Calculate PnL
       │ 5. Get 1inch quote (optional)
       ▼
┌───────────────────┐
│  NitroliteClient  │
└──────┬────────────┘
       │ 6. Sign state update
       ▼
┌───────────────────┐
│   Yellow Node     │ Off-chain state
└───────────────────┘
```

### Settlement Flow

```
┌─────────┐
│  Admin  │ Triggers settlement
└────┬────┘
     │ 1. CLI command: settle-deal
     ▼
┌───────────────────┐
│ DealOrchestrator  │
└──────┬────────────┘
       │ 2. Finalize channel
       ▼
┌───────────────────┐
│  NitroliteClient  │
└──────┬────────────┘
       │ 3. Generate final state + proof
       ▼
┌───────────────────┐
│  Adjudicator.sol  │
└──────┬────────────┘
       │ 4. Conclude channel
       │ 5. Wait challenge period
       ▼
┌───────────────────┐
│  AssetHolder.sol  │
└──────┬────────────┘
       │ 6. Withdraw to DealVault
       ▼
┌───────────────────┐
│  DealVault.sol    │
└──────┬────────────┘
       │ 7. markSettled(pnl)
       │ 8. Status: Settled
       ▼
┌───────────────────┐
│ DealOrchestrator  │
└──────┬────────────┘
       │ 9. Send LayerZero message
       ▼
┌───────────────────┐
│ DealMessenger.sol │
└──────┬────────────┘
       │ 10. _lzSend()
       ▼
┌───────────────────┐
│ LayerZero DVNs    │ Verify message
└──────┬────────────┘
       │ 11. Execute on dest
       ▼
┌────────────────────────┐
│ RemoteAccounting.sol   │
│ (Base Sepolia)         │
└──────┬─────────────────┘
       │ 12. Store deal metrics
       │ 13. Emit event
       ▼
┌───────────────────┐
│   Frontend        │ Display settlement
└───────────────────┘
```

### Claim Flow

```
┌──────┐
│  LP  │
└──┬───┘
   │ 1. Navigate to positions
   ▼
┌─────────────────┐
│   Frontend      │
│ (ClaimPanel)    │
└──────┬──────────┘
       │ 2. Call claim(positionId)
       ▼
┌──────────────────┐
│  DealVault.sol   │
└──────┬───────────┘
       │ 3. Verify position owner
       │ 4. Calculate claimable amount
       │ 5. Burn Position NFT
       ▼
┌──────────────────┐
│ DealPosition.sol │
└──────┬───────────┘
       │ 6. NFT burned
       ▼
┌──────────────────┐
│  DealVault.sol   │
└──────┬───────────┘
       │ 7. Transfer USDC
       ▼
┌──────┐
│  LP  │ Receives principal + yield
└──────┘
```

## Cross-Chain Message Flow

```
Flare Network
┌───────────────────┐
│ DealMessenger.sol │
└──────┬────────────┘
       │ 1. Encode payload
       │    {dealId, finalPnL, timestamp}
       │
       │ 2. _lzSend(dstEid, payload, options)
       ▼
┌───────────────────┐
│ LayerZero         │
│ Endpoint          │
└──────┬────────────┘
       │ 3. Emit PacketSent
       ▼
┌───────────────────┐
│ DVN Network       │ (Off-chain)
│ - Horizen         │
│ - Polyhedra       │
│ - LayerZero Labs  │
└──────┬────────────┘
       │ 4. Verify message
       │    (multi-sig verification)
       ▼
┌───────────────────┐
│ LayerZero         │
│ Executor          │
└──────┬────────────┘
       │ 5. Execute on destination
       ▼
Base Sepolia
┌────────────────────────┐
│ RemoteAccounting.sol   │
└──────┬─────────────────┘
       │ 6. _lzReceive(origin, guid, payload)
       │ 7. Decode & store
       │ 8. Emit DealSettled event
       ▼
┌───────────────────┐
│ Indexer / Graph   │ (Optional)
└───────────────────┘
```

## State Management

### Smart Contract State

#### DealVault State Machine

```
┌─────────┐
│  DRAFT  │ (not used in v1)
└────┬────┘
     │ createDeal()
     ▼
┌─────────┐
│  OPEN   │ ← LPs can deposit
└────┬────┘
     │ lock()
     ▼
┌─────────┐
│ LOCKED  │ ← Strategy executes
└────┬────┘
     │ markSettled()
     ▼
┌──────────┐
│ SETTLED  │ ← LPs can claim
└──────────┘
```

#### Position NFT State

```
Position {
  uint256 dealId;
  uint256 depositAmount;
  uint256 depositTime;
  uint256 claimableAmount; // Set after settlement
  bool claimed;
}
```

### Backend State

#### Channel State Tracking

```typescript
interface ChannelState {
  channelId: string;
  dealId: string;
  participants: [string, string]; // [vault, strategy]
  balances: [bigint, bigint];
  nonce: number;
  status: 'OPENING' | 'OPEN' | 'UPDATING' | 'FINALIZING' | 'FINALIZED';
  lastUpdate: Date;
}
```

#### Deal State Cache

```typescript
interface DealCache {
  dealId: string;
  status: DealStatus;
  totalDeposits: bigint;
  positionCount: number;
  channelId?: string;
  finalPnL?: bigint;
  lastSync: Date;
}
```

### Frontend State (React)

```typescript
// Global state via TanStack Query
const { data: deals } = useQuery({
  queryKey: ['deals'],
  queryFn: fetchDeals,
});

// Per-deal state
const { data: deal } = useQuery({
  queryKey: ['deal', dealId],
  queryFn: () => fetchDeal(dealId),
});

// User positions
const { data: positions } = useQuery({
  queryKey: ['positions', address],
  queryFn: () => fetchPositions(address),
  enabled: !!address,
});

// Real-time price
const { data: price } = useQuery({
  queryKey: ['ftso-price', 'FLR/USD'],
  queryFn: () => fetchFTSOPrice('FLR/USD'),
  refetchInterval: 5000, // Every 5 seconds
});
```

## Security Architecture

### Authentication & Authorization

```
┌──────────────────────────────────────────────┐
│            Authorization Layers               │
├──────────────────────────────────────────────┤
│ Level 1: Smart Contract Access Control       │
│  - Ownable2Step for admin functions         │
│  - NFT ownership for LP actions              │
│                                              │
│ Level 2: Backend API (if exposed)           │
│  - JWT tokens for admin CLI                 │
│  - API keys for internal services           │
│                                              │
│ Level 3: Frontend Wallet Verification       │
│  - Signature verification via wagmi         │
│  - Address-based permissions                │
└──────────────────────────────────────────────┘
```

### Key Security Patterns

1. **Reentrancy Protection**: All external calls guarded by ReentrancyGuard
2. **Signature Verification**: Channel states cryptographically signed
3. **Time-locks**: Challenge periods for channel settlements
4. **Input Validation**: Comprehensive checks on all parameters
5. **Access Control**: Role-based permissions (admin vs LP)
6. **Rate Limiting**: Backend API rate limits (if exposed)

## Monitoring & Observability

### Event Tracking

```typescript
// Contract events monitored
- DealCreated(dealId, params)
- Deposited(dealId, lp, amount, positionId)
- DealLocked(dealId, channelId)
- DealSettled(dealId, pnl)
- Claimed(positionId, lp, amount)

// Backend logs
- Channel opened: { dealId, channelId, participants }
- State updated: { channelId, nonce, balances }
- Settlement triggered: { dealId, finalPnL }
- LZ message sent: { dealId, remoteChain, txHash }

// Frontend analytics (optional)
- Page views
- Wallet connections
- Deposits initiated
- Claims completed
```

### Health Checks

```typescript
// Backend health endpoint
GET /health
Response: {
  status: 'healthy' | 'degraded' | 'down',
  checks: {
    flareRpc: boolean,
    yellowNode: boolean,
    database: boolean,
    layerzeroEndpoint: boolean
  },
  uptime: number,
  lastSync: timestamp
}
```

## Scalability Considerations

### Current Architecture Limitations

1. **Single Backend**: Backend is single point of failure
2. **In-Memory State**: Channel state not persisted across restarts
3. **Sequential Processing**: Deals processed one at a time
4. **No Caching Layer**: Repeated RPC calls

### Future Improvements

1. **Horizontal Scaling**: Multiple backend instances with load balancer
2. **Database**: PostgreSQL or MongoDB for state persistence
3. **Message Queue**: RabbitMQ/Redis for async job processing
4. **CDN**: Cache frontend assets and static data
5. **GraphQL/Subgraph**: Index events for faster queries

*Last Updated: 2025-11-22 01:54 UTC*
