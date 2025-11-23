/**
 * DealVault Service
 * Interacts with DealVault contract on Flare mainnet
 */
import { 
  createWalletClient, 
  createPublicClient,
  http, 
  type Address,
  type Hash
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createModuleLogger } from '../../utils/logger';
import { CHAINS } from '../../config/chains';
import { FLARE_CONTRACTS } from '../../config/contracts';

const logger = createModuleLogger('dealVault');

// DealVault ABI - only the functions we need
const DEAL_VAULT_ABI = [
  {
    name: 'createDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositToken', type: 'address' },
      { name: 'minDeposit', type: 'uint256' },
      { name: 'maxDeposit', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
      { name: 'expectedYield', type: 'uint256' },
    ],
    outputs: [{ name: 'dealId', type: 'uint256' }],
  },
  {
    name: 'lockDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'linkChannel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'uint256' },
      { name: 'channelId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'finalizeDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getDeal',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'dealId', type: 'uint256' },
          { name: 'depositToken', type: 'address' },
          { name: 'targetToken', type: 'address' },
          { name: 'targetChainId', type: 'uint256' },
          { name: 'minDeposit', type: 'uint256' },
          { name: 'maxDeposit', type: 'uint256' },
          { name: 'totalDeposited', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'duration', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'expectedYield', type: 'uint256' },
          { name: 'channelId', type: 'bytes32' },
        ],
      },
    ],
  },
  {
    name: 'isDealActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export interface CreateDealParams {
  depositToken: Address;
  targetToken: Address;
  targetChainId: bigint;
  minDeposit: bigint;
  maxDeposit: bigint;
  duration: bigint; // in seconds
  expectedYield: bigint; // in basis points (100 = 1%)
}

export interface Deal {
  dealId: bigint;
  depositToken: Address;
  targetToken: Address;
  targetChainId: bigint;
  minDeposit: bigint;
  maxDeposit: bigint;
  totalDeposited: bigint;
  startTime: bigint;
  duration: bigint;
  status: number;
  expectedYield: bigint;
  channelId: `0x${string}`;
}

/**
 * Service for interacting with DealVault contract
 */
export class DealVaultService {
  private walletClient: any;
  private publicClient: any;
  private vaultAddress!: Address; // Definitely assigned in initialize()

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      if (!process.env.PRIVATE_KEY_BACKEND) {
        throw new Error('PRIVATE_KEY_BACKEND not configured');
      }

      if (!FLARE_CONTRACTS.dealVault) {
        throw new Error('DEAL_VAULT_ADDRESS not configured');
      }

      this.vaultAddress = FLARE_CONTRACTS.dealVault as Address;

      // Create account from private key
      const account = privateKeyToAccount(
        process.env.PRIVATE_KEY_BACKEND as `0x${string}`
      );

      // Create wallet client for writing
      this.walletClient = createWalletClient({
        account,
        chain: {
          id: CHAINS.flare.id,
          name: CHAINS.flare.name,
          nativeCurrency: CHAINS.flare.nativeCurrency,
          rpcUrls: {
            default: { http: [CHAINS.flare.rpcUrl] },
            public: { http: [CHAINS.flare.rpcUrl] },
          },
        },
        transport: http(CHAINS.flare.rpcUrl),
      });

      // Create public client for reading
      this.publicClient = createPublicClient({
        chain: {
          id: CHAINS.flare.id,
          name: CHAINS.flare.name,
          nativeCurrency: CHAINS.flare.nativeCurrency,
          rpcUrls: {
            default: { http: [CHAINS.flare.rpcUrl] },
            public: { http: [CHAINS.flare.rpcUrl] },
          },
        },
        transport: http(CHAINS.flare.rpcUrl),
      });

      logger.info('DealVault service initialized', {
        vault: this.vaultAddress,
        chain: CHAINS.flare.name,
      });
    } catch (error) {
      logger.error('Failed to initialize DealVault service', error);
      throw error;
    }
  }

  /**
   * Create a new deal on-chain
   */
  async createDeal(params: CreateDealParams): Promise<{
    dealId: bigint;
    txHash: Hash;
  }> {
    try {
      logger.info('Creating deal on-chain', { params });

      // Simulate the transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.vaultAddress,
        abi: DEAL_VAULT_ABI,
        functionName: 'createDeal',
        args: [
          params.depositToken,
          params.minDeposit,
          params.maxDeposit,
          BigInt(params.duration),
          BigInt(params.expectedYield),
        ],
        account: this.walletClient.account,
      });

      // Execute the transaction
      const txHash = await this.walletClient.writeContract(request);

      logger.info('Deal creation transaction sent', { txHash });

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      logger.info('Deal creation confirmed', {
        txHash,
        blockNumber: receipt.blockNumber,
      });

      // Extract dealId from logs
      const dealId = request.result as bigint;

      return { dealId, txHash };
    } catch (error) {
      logger.error('Failed to create deal on-chain', error);
      throw error;
    }
  }

  /**
   * Get deal information from contract
   */
  async getDeal(dealId: bigint): Promise<Deal> {
    try {
      const deal = await this.publicClient.readContract({
        address: this.vaultAddress,
        abi: DEAL_VAULT_ABI,
        functionName: 'getDeal',
        args: [dealId],
      });

      return deal as Deal;
    } catch (error) {
      logger.error('Failed to get deal from contract', error);
      throw error;
    }
  }

  /**
   * Check if deal is active
   */
  async isDealActive(dealId: bigint): Promise<boolean> {
    try {
      const isActive = await this.publicClient.readContract({
        address: this.vaultAddress,
        abi: DEAL_VAULT_ABI,
        functionName: 'isDealActive',
        args: [dealId],
      });

      return isActive as boolean;
    } catch (error) {
      logger.error('Failed to check deal status', error);
      throw error;
    }
  }

  /**
   * Link a state channel to a deal
   */
  async linkChannel(dealId: bigint, channelId: string): Promise<Hash> {
    try {
      logger.info('Linking channel to deal', { dealId, channelId });

      const txHash = await this.walletClient.writeContract({
        address: this.vaultAddress,
        abi: DEAL_VAULT_ABI,
        functionName: 'linkChannel',
        args: [dealId, channelId as `0x${string}`],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      logger.info('Channel linked successfully', { dealId, channelId, txHash });

      return txHash;
    } catch (error) {
      logger.error('Failed to link channel', error);
      throw error;
    }
  }

  /**
   * Lock a deal (prevent new deposits)
   */
  async lockDeal(dealId: bigint): Promise<Hash> {
    try {
      logger.info('Locking deal', { dealId });

      const txHash = await this.walletClient.writeContract({
        address: this.vaultAddress,
        abi: DEAL_VAULT_ABI,
        functionName: 'lockDeal',
        args: [dealId],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      logger.info('Deal locked successfully', { dealId, txHash });

      return txHash;
    } catch (error) {
      logger.error('Failed to lock deal', error);
      throw error;
    }
  }

  /**
   * Finalize a deal
   */
  async finalizeDeal(dealId: bigint): Promise<Hash> {
    try {
      logger.info('Finalizing deal', { dealId });

      const txHash = await this.walletClient.writeContract({
        address: this.vaultAddress,
        abi: DEAL_VAULT_ABI,
        functionName: 'finalizeDeal',
        args: [dealId],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      logger.info('Deal finalized successfully', { dealId, txHash });

      return txHash;
    } catch (error) {
      logger.error('Failed to finalize deal', error);
      throw error;
    }
  }

  /**
   * Get the vault address
   */
  getVaultAddress(): Address {
    return this.vaultAddress;
  }
}

// Export singleton instance
export const dealVaultService = new DealVaultService();
