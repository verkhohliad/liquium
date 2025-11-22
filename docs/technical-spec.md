# Liquium - Technical Specification

## Document Overview

This document provides detailed technical specifications for all components of the Liquium platform, including smart contracts, backend services, frontend application, and integration points.

---

## 1. Smart Contract Specifications

### 1.1 DealFactory.sol

**Purpose**: Factory contract for creating and tracking DealVault instances

**Inheritance**: `Ownable2Step`, `Pausable`

**State Variables**:
```solidity
// Counter for deal IDs
uint256 public nextDealId;

// Mapping of dealId to DealVault address
mapping(uint256 => address) public dealVaults;

// Array of all deal IDs
uint256[] public allDealIds;

// Reference to DealPosition NFT contract
IDealPosition public immutable dealPosition;

// Reference to ChannelRegistry
IChannelRegistry public immutable channelRegistry;

// Reference to FlarePriceReader
IFlarePriceReader public immutable priceReader;
```

**Structs**:
```solidity
struct DealParams {
    string name;
    string description;
    address depositToken;      // USDC address
    uint256 targetSize;        // Max total deposits
    uint256 depositStart;      // Timestamp when deposits open
    uint256 depositEnd;        // Timestamp when deposits close
    uint256 lockupDuration;    // Duration after lock
    uint256 expectedAPR;       // Basis points (100 = 1%)
    bytes strategyData;        // Arbitrary strategy metadata
}
```

**Functions**:
```solidity
/// @notice Create a new deal vault
/// @param params Deal parameters
/// @return dealId The ID of the created deal
function createDeal(DealParams calldata params) 
    external 
    onlyOwner 
    whenNotPaused 
    returns (uint256 dealId);

/// @notice Get all deal IDs
function getAllDealIds() external view returns (uint256[] memory);

/// @notice Get deal vault address
function getDealVault(uint256 dealId) external view returns (address);
```

**Events**:
```solidity
event DealCreated(
    uint256 indexed dealId,
    address indexed vaultAddress,
    string name,
    uint256 targetSize
);
```

---

### 1.2 DealVault.sol

**Purpose**: Manages LP deposits, deal lifecycle, and settlement

**Inheritance**: `Ownable2Step`, `ReentrancyGuard`, `Pausable`

**State Variables**:
```solidity
// Deal identification
uint256 public immutable dealId;
string public name;
string public description;

// Deal parameters
address public immutable depositToken;
uint256 public targetSize;
uint256 public depositStart;
uint256 public depositEnd;
uint256 public lockupDuration;
uint256 public expectedAPR;

// Deal state
enum Status { OPEN, LOCKED, SETTLING, SETTLED }
Status public status;
uint256 public totalDeposits;
uint256 public lockedAt;

// Position tracking
IDealPosition public immutable positionNFT;
uint256 public nextPositionId;
mapping(uint256 => uint256) public positionDeposits;
mapping(uint256 => uint256) public positionClaimable;

// Settlement
int256 public finalPnL; // Can be negative
uint256 public settlementTimestamp;

// References
IChannelRegistry public immutable channelRegistry;
IFlarePriceReader public immutable priceReader;
```

**Functions**:
```solidity
/// @notice Deposit funds into the deal
/// @param amount Amount of deposit token to deposit
/// @return positionId The ID of the minted position NFT
function deposit(uint256 amount) 
    external 
    nonReentrant 
    whenNotPaused 
    returns (uint256 positionId);

/// @notice Lock deal and prepare for strategy execution
/// @dev Can only be called by owner when deposit window closed
function lock() external onlyOwner;

/// @notice Mark deal as settled with final PnL
/// @param pnl Final profit/loss in basis points
/// @param channelProof Proof of channel settlement
function markSettled(int256 pnl, bytes calldata channelProof) 
    external 
    onlyOwner;

/// @notice Claim proceeds for a position
/// @param positionId The NFT position ID to claim
function claim(uint256 positionId) external nonReentrant;

/// @notice Emergency withdraw (if deal failed before lock)
/// @param positionId The position to withdraw
function emergencyWithdraw(uint256 positionId) external nonReentrant;

// View functions
function getDepositWindow() external view returns (uint256 start, uint256 end);
function getTotalDeposits() external view returns (uint256);
function getClaimableAmount(uint256 positionId) external view returns (uint256);
function getCurrentPrice() external view returns (uint256 price, uint256 timestamp);
```

**Events**:
```solidity
event Deposited(
    uint256 indexed dealId,
    address indexed lp,
    uint256 amount,
    uint256 indexed positionId
);

event DealLocked(uint256 indexed dealId, uint256 timestamp);

event DealSettled(
    uint256 indexed dealId,
    int256 pnl,
    uint256 timestamp
);

event Claimed(
    uint256 indexed positionId,
    address indexed lp,
    uint256 amount
);

event EmergencyWithdraw(
    uint256 indexed positionId,
    address indexed lp,
    uint256 amount
);
```

**Modifiers**:
```solidity
modifier onlyDuringDepositWindow() {
    require(
        block.timestamp >= depositStart && block.timestamp <= depositEnd,
        "Outside deposit window"
    );
    _;
}

modifier onlyStatus(Status _status) {
    require(status == _status, "Invalid status");
    _;
}
```

---

### 1.3 DealPosition.sol (ERC-721)

**Purpose**: NFT representing LP positions in deals

**Inheritance**: `ERC721`, `ERC721Enumerable`, `Ownable2Step`

**State Variables**:
```solidity
// Position metadata
struct Position {
    uint256 dealId;
    uint256 depositAmount;
    uint256 depositTime;
    bool claimed;
}

mapping(uint256 => Position) public positions;

// Only DealVault contracts can mint
mapping(address => bool) public authorizedVaults;
```

**Functions**:
```solidity
/// @notice Mint new position NFT
/// @param to LP address
/// @param dealId Deal identifier
/// @param depositAmount Amount deposited
/// @return tokenId Minted token ID
function mint(
    address to,
    uint256 dealId,
    uint256 depositAmount
) external returns (uint256 tokenId);

/// @notice Burn position NFT when claimed
/// @param tokenId Token to burn
function burn(uint256 tokenId) external;

/// @notice Authorize a vault to mint positions
function authorizeVault(address vault) external onlyOwner;

// Metadata
function tokenURI(uint256 tokenId) 
    public 
    view 
    override 
    returns (string memory);
```

---

### 1.4 ChannelRegistry.sol

**Purpose**: Maps deal IDs to Yellow Nitrolite channel IDs

**Inheritance**: `Ownable2Step`

**State Variables**:
```solidity
// Mapping: dealId => channelId
mapping(uint256 => bytes32) public dealChannels;

// Reverse mapping: channelId => dealId
mapping(bytes32 => uint256) public channelDeals;

// Authorized registrars (backend addresses)
mapping(address => bool) public authorizedRegistrars;
```

**Functions**:
```solidity
/// @notice Register a channel for a deal
/// @param dealId Deal identifier
/// @param channelId Yellow channel ID
function registerChannel(uint256 dealId, bytes32 channelId) 
    external 
    onlyAuthorized;

/// @notice Get channel ID for deal
function getChannelId(uint256 dealId) 
    external 
    view 
    returns (bytes32);

/// @notice Check if channel is registered
function isChannelRegistered(uint256 dealId) 
    external 
    view 
    returns (bool);
```

---

### 1.5 FlarePriceReader.sol

**Purpose**: Read FTSO v2 price feeds

**State Variables**:
```solidity
// FTSO v2 Feed Publisher interface
IFtsoFeedPublisher public immutable ftsoFeedPublisher;

// Cached prices
struct PriceData {
    uint256 value;
    int8 decimals;
    uint64 timestamp;
}

mapping(bytes21 => PriceData) public cachedPrices;
uint256 public constant CACHE_DURATION = 5 seconds;
```

**Functions**:
```solidity
/// @notice Get current price for a feed
/// @param feedId FTSO feed identifier
/// @return price Current price
/// @return decimals Decimal places
/// @return timestamp Price timestamp
function getCurrentPrice(bytes21 feedId) 
    public 
    view 
    returns (uint256 price, int8 decimals, uint64 timestamp);

/// @notice Get multiple prices in one call
function getPrices(bytes21[] calldata feedIds) 
    external 
    view 
    returns (PriceData[] memory);

/// @notice Update cached price
function updateCache(bytes21 feedId) external;
```

---

### 1.6 DealMessenger.sol (LayerZero OApp)

**Purpose**: Send cross-chain messages about deal settlements

**Inheritance**: `OApp`, `Ownable2Step`

**State Variables**:
```solidity
// Message types
uint16 public constant MSG_DEAL_CREATED = 1;
uint16 public constant MSG_DEAL_SETTLED = 2;

// Mapping: dealId => sent messages
mapping(uint256 => bytes32[]) public sentMessages;
```

**Functions**:
```solidity
/// @notice Send deal settlement message
/// @param dstEid Destination endpoint ID
/// @param dealId Deal identifier
/// @param pnl Final PnL
/// @param options LayerZero options
function sendSettlement(
    uint32 dstEid,
    uint256 dealId,
    int256 pnl,
    bytes calldata options
) external payable returns (bytes32 guid);

/// @notice Internal receive handler
function _lzReceive(
    Origin calldata origin,
    bytes32 guid,
    bytes calldata payload,
    address executor,
    bytes calldata extraData
) internal override;

/// @notice Quote message fee
function quote(
    uint32 dstEid,
    uint256 dealId,
    int256 pnl,
    bytes calldata options
) external view returns (MessagingFee memory);
```

---

### 1.7 RemoteAccounting.sol (Base Sepolia)

**Purpose**: Receive and store deal settlement data

**Inheritance**: `OApp`, `Ownable2Step`

**State Variables**:
```solidity
struct DealSettlement {
    uint256 dealId;
    int256 pnl;
    uint256 timestamp;
    bytes32 guid; // LayerZero message ID
}

// Mapping: dealId => settlement data
mapping(uint256 => DealSettlement) public settlements;

// Array of all settled deals
uint256[] public settledDeals;
```

**Functions**:
```solidity
/// @notice Internal receive handler
function _lzReceive(
    Origin calldata origin,
    bytes32 guid,
    bytes calldata payload,
    address executor,
    bytes calldata extraData
) internal override;

/// @notice Get settlement for deal
function getSettlement(uint256 dealId) 
    external 
    view 
    returns (DealSettlement memory);

/// @notice Get all settlements
function getAllSettlements() 
    external 
    view 
    returns (DealSettlement[] memory);
```

---

## 2. Backend Service Specifications

### 2.1 Configuration Schema

```typescript
// config.ts
interface Config {
  networks: {
    flare: {
      rpcUrl: string;
      chainId: number;
      contracts: {
        dealFactory: Address;
        channelRegistry: Address;
        priceReader: Address;
        dealMessenger: Address;
      };
    };
    base: {
      rpcUrl: string;
      chainId: number;
      contracts: {
        remoteAccounting: Address;
      };
    };
  };
  
  yellow: {
    nodeUrl: string;
    appId: string;
  };
  
  layerzero: {
    flareEid: number;
    baseEid: number;
  };
  
  oneInch: {
    apiKey: string;
    baseUrl: string;
  };
  
  keys: {
    deployer: Hex;
    backend: Hex;
  };
}
```

### 2.2 Service Interfaces

#### FlareClient

```typescript
interface IFlareClient {
  // Contract calls
  createDeal(params: DealParams): Promise<{ dealId: bigint; txHash: Hex }>;
  lockDeal(dealId: bigint): Promise<{ txHash: Hex }>;
  markSettled(dealId: bigint, pnl: bigint, proof: Hex): Promise<{ txHash: Hex }>;
  
  // Read functions
  getDeal(dealId: bigint): Promise<Deal>;
  getAllDeals(): Promise<Deal[]>;
  getPosition(positionId: bigint): Promise<Position>;
  
  // Price feeds
  getCurrentPrice(feedId: Hex): Promise<{ price: bigint; decimals: number; timestamp: bigint }>;
  
  // Event listening
  onDealCreated(callback: (event: DealCreatedEvent) => void): void;
  onDeposited(callback: (event: DepositedEvent) => void): void;
  onDealLocked(callback: (event: DealLockedEvent) => void): void;
}
```

#### NitroliteClient

```typescript
interface INitroliteClient {
  // Channel lifecycle
  openChannel(params: ChannelParams): Promise<{ channelId: Hex }>;
  updateState(channelId: Hex, newState: ChannelState): Promise<void>;
  finalizeChannel(channelId: Hex): Promise<{ finalState: ChannelState; proof: Hex }>;
  
  // State queries
  getChannel(channelId: Hex): Promise<Channel>;
  getChannelState(channelId: Hex): Promise<ChannelState>;
  
  // Verification
  verifySignature(state: ChannelState, signature: Hex, signer: Address): boolean;
}

interface ChannelParams {
  participants: [Address, Address];
  challengeDuration: number; // seconds
  depositToken: Address;
  depositAmount: bigint;
}

interface ChannelState {
  balances: [bigint, bigint];
  nonce: number;
  isFinal: boolean;
}
```

#### LayerZeroClient

```typescript
interface ILayerZeroClient {
  // Message sending
  sendSettlement(
    dealId: bigint,
    pnl: bigint,
    dstEid: number
  ): Promise<{ guid: Hex; txHash: Hex }>;
  
  // Status tracking
  getMessageStatus(guid: Hex): Promise<MessageStatus>;
  waitForDelivery(guid: Hex, timeout?: number): Promise<boolean>;
  
  // Fee estimation
  quote(dealId: bigint, pnl: bigint, dstEid: number): Promise<{ nativeFee: bigint }>;
}

enum MessageStatus {
  SENT = 'SENT',
  VERIFIED = 'VERIFIED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED'
}
```

#### OneInchClient

```typescript
interface IOneInchClient {
  // Quote fetching
  getQuote(params: SwapParams): Promise<Quote>;
  
  // Swap building (optional)
  buildSwap(params: SwapParams): Promise<SwapTransaction>;
  
  // Cache management
  getCachedQuote(params: SwapParams): Quote | null;
  cacheQuote(params: SwapParams, quote: Quote): void;
}

interface SwapParams {
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  chainId: number;
  from?: Address;
  slippage?: number;
}

interface Quote {
  toAmount: bigint;
  estimatedGas: bigint;
  protocols: Protocol[][];
}
```

### 2.3 Workflow Specifications

#### DealOrchestrator

```typescript
class DealOrchestrator {
  constructor(
    private flareClient: IFlareClient,
    private nitroliteClient: INitroliteClient,
    private layerzeroClient: ILayerZeroClient,
    private oneInchClient: IOneInchClient,
    private logger: Logger
  ) {}
  
  // Main workflows
  async createDeal(params: DealParams): Promise<{ dealId: bigint }>;
  async lockDeal(dealId: bigint): Promise<{ channelId: Hex }>;
  async executeDeal(dealId: bigint): Promise<void>;
  async settleDeal(dealId: bigint): Promise<{ pnl: bigint }>;
  
  // Internal methods
  private async openChannel(dealId: bigint, capital: bigint): Promise<Hex>;
  private async simulateStrategy(dealId: bigint): Promise<bigint>;
  private async finalizeChannel(channelId: Hex): Promise<ChannelState>;
  private async notifyRemoteChain(dealId: bigint, pnl: bigint): Promise<void>;
}
```

---

## 3. Frontend Specifications

### 3.1 Component Props

#### DealCard

```typescript
interface DealCardProps {
  deal: {
    id: bigint;
    name: string;
    description: string;
    targetSize: bigint;
    totalDeposits: bigint;
    depositStart: bigint;
    depositEnd: bigint;
    expectedAPR: number;
    status: DealStatus;
  };
  onClick?: () => void;
}
```

#### DepositForm

```typescript
interface DepositFormProps {
  dealId: bigint;
  maxDeposit: bigint;
  depositToken: Address;
  onSuccess?: (positionId: bigint) => void;
  onError?: (error: Error) => void;
}
```

#### ClaimPanel

```typescript
interface ClaimPanelProps {
  positionId: bigint;
  claimableAmount: bigint;
  depositAmount: bigint;
  onSuccess?: () => void;
}
```

### 3.2 Custom Hooks

#### useDealVault

```typescript
function useDealVault(dealId: bigint) {
  return {
    deal: Deal | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
}
```

#### useDeposit

```typescript
function useDeposit(dealId: bigint) {
  return {
    deposit: (amount: bigint) => Promise<{ positionId: bigint }>;
    isLoading: boolean;
    error: Error | null;
  };
}
```

#### useFTSOPrice

```typescript
function useFTSOPrice(feedId: string) {
  return {
    price: bigint | undefined;
    decimals: number | undefined;
    timestamp: bigint | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}
```

---

## 4. API Specifications

### 4.1 Backend REST API (Optional)

```
GET /api/deals
Response: Deal[]

GET /api/deals/:id
Response: Deal

GET /api/deals/:id/price
Response: { price: string, decimals: number, timestamp: string }

GET /api/deals/:id/quote
Response: { route: Protocol[][], estimatedOutput: string }

GET /api/positions/:id
Response: Position

GET /api/health
Response: { status: string, checks: HealthChecks }
```

### 4.2 WebSocket Events (Optional)

```typescript
// Client subscribes
ws.send({ type: 'subscribe', dealId: '1' });

// Server sends updates
{
  type: 'deal_update',
  dealId: '1',
  status: 'LOCKED',
  timestamp: 1234567890
}

{
  type: 'price_update',
  feedId: 'FLR/USD',
  price: '0.025',
  timestamp: 1234567890
}
```

---

## 5. Testing Specifications

### 5.1 Smart Contract Tests

```solidity
// Unit tests
- DealFactory: deal creation, authorization
- DealVault: deposits, locks, settlements, claims
- DealPosition: minting, burning, transfers
- ChannelRegistry: registration, lookups
- FlarePriceReader: price queries, caching
- DealMessenger: message sending, receiving

// Integration tests
- Full deal lifecycle: create → deposit → lock → settle → claim
- Cross-chain messaging: Flare → Base Sepolia
- Price feed integration: FTSO queries
- Channel integration: Nitrolite lifecycle

// Gas benchmarks
- Deposit gas cost
- Claim gas cost
- Settlement gas cost
- Cross-chain message cost
```

### 5.2 Backend Tests

```typescript
// Unit tests
- FlareClient: RPC calls, event parsing
- NitroliteClient: channel operations
- LayerZeroClient: message sending, tracking
- OneInchClient: quote fetching, caching

// Integration tests
- Deal orchestration: full workflow
- Event listening: proper handling
- Error handling: retries, fallbacks

// E2E tests
- Create deal via CLI
- Lock deal and open channel
- Settle deal and send LZ message
```

### 5.3 Frontend Tests

```typescript
// Component tests
- DealCard rendering
- DepositForm validation
- ClaimPanel interaction

// Hook tests
- useDealVault data fetching
- useDeposit transaction flow
- useFTSOPrice updates

// E2E tests (Playwright)
- Connect wallet
- Deposit into deal
- Claim proceeds
```

---

## 6. Deployment Specifications

### 6.1 Smart Contract Deployment Order

```
1. Deploy DealPosition (ERC-721)
2. Deploy ChannelRegistry
3. Deploy FlarePriceReader
4. Deploy DealFactory
5. Deploy DealMessenger (OApp)
6. Configure LayerZero peers
7. Deploy RemoteAccounting (Base Sepolia)
8. Wire OApp connections
```

### 6.2 Environment Variables

See `.env.example` in root and each package

### 6.3 Contract Verification

```bash
# Flare Coston2
npx hardhat verify --network coston2 <ADDRESS> <CONSTRUCTOR_ARGS>

# Base Sepolia
npx hardhat verify --network baseSepolia <ADDRESS> <CONSTRUCTOR_ARGS>
```

---

*Last Updated: 2025-11-22 02:00 UTC*
