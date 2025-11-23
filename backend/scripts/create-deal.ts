#!/usr/bin/env ts-node
/**
 * CLI Tool to Create Deals via API
 * 
 * Usage:
 *   npm run create-deal -- --deposit USDC --target BTC --yield 500 --duration 7d
 * 
 * Options:
 *   --deposit <token>     Deposit token symbol (USDC, USDT, etc.)
 *   --target <token>      Target token symbol (BTC, ETH, etc.)
 *   --target-chain <id>   Target chain ID (default: 8453 for Base)
 *   --min <amount>        Minimum deposit (default: 100)
 *   --max <amount>        Maximum deposit (default: 10000)
 *   --duration <time>     Duration (e.g., 7d, 30d, 90d)
 *   --yield <bps>         Expected yield in basis points (e.g., 500 = 5%)
 *   --dealer <address>    Dealer address (default: from env)
 */

/*
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{
    "depositToken": "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
    "targetToken": "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
    "targetChainId": "8453",
    "minDeposit": "100000000",
    "maxDeposit": "10000000000",
    "duration": "604800",
    "expectedYield": "500",
    "dealer": "0x4aEF4F9c8e48e5863BeE99BD142e7956B9600d58"
  }'
 */



import 'dotenv/config';
import { parseArgs } from 'node:util';
import { type Address } from 'viem';

// Token addresses on Flare Mainnet
const FLARE_TOKENS: Record<string, Address> = {
  USDC: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as Address, // UPDATE WITH ACTUAL ADDRESS
  // USDT: '0x...' as Address, // UPDATE WITH ACTUAL ADDRESS
  // BTC: '0x...' as Address,  // Wrapped BTC
  // ETH: '0x...' as Address,  // Wrapped ETH
  // FLR: '0x...' as Address,  // Wrapped FLR
};

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Parse duration string to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error('Invalid duration format. Use: 1d, 7d, 30d, etc.');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new Error('Invalid duration unit');
  }
}

/**
 * Parse token amount (supports decimals)
 */
function parseTokenAmount(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount);
  return Math.floor(num * Math.pow(10, decimals)).toString();
}

/**
 * Call API to create deal
 */
async function createDealAPI(params: any) {
  const response = await fetch(`${API_URL}/api/deals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'API request failed');
  }

  return await response.json();
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Liquium Deal Creator\n');

  // Parse command line arguments
  const { values } = parseArgs({
    options: {
      deposit: { type: 'string' },
      target: { type: 'string' },
      'target-chain': { type: 'string', default: '8453' },
      min: { type: 'string', default: '100' },
      max: { type: 'string', default: '10000' },
      duration: { type: 'string' },
      yield: { type: 'string' },
      dealer: { type: 'string' },
    },
  });

  // Validate required fields
  if (!values.deposit || !values.target || !values.duration || !values.yield) {
    console.error('❌ Missing required arguments\n');
    console.log('Usage:');
    console.log('  npm run create-deal -- --deposit USDC --target BTC --duration 7d --yield 500\n');
    console.log('Options:');
    console.log('  --deposit <token>     Deposit token (USDC, USDT, etc.)');
    console.log('  --target <token>      Target token (BTC, ETH, etc.)');
    console.log('  --target-chain <id>   Target chain ID (default: 8453)');
    console.log('  --min <amount>        Min deposit (default: 100)');
    console.log('  --max <amount>        Max deposit (default: 10000)');
    console.log('  --duration <time>     Duration (7d, 30d, 90d)');
    console.log('  --yield <bps>         Expected yield in basis points (500 = 5%)');
    console.log('  --dealer <address>    Dealer address\n');
    process.exit(1);
  }

  const depositToken = values.deposit.toUpperCase();
  const targetToken = values.target.toUpperCase();

  // Get token addresses
  const depositAddress = FLARE_TOKENS[depositToken];
  const targetAddress = FLARE_TOKENS[targetToken];

  if (!depositAddress || !targetAddress) {
    console.error(`❌ Unknown token. Available: ${Object.keys(FLARE_TOKENS).join(', ')}`);
    process.exit(1);
  }

  const dealer = (values.dealer as Address) || process.env.DEFAULT_DEALER_ADDRESS as Address;
  if (!dealer) {
    console.error('❌ Dealer address not specified. Set --dealer or DEFAULT_DEALER_ADDRESS');
    process.exit(1);
  }

  // Parse parameters
  const targetChainId = values['target-chain'] as string;
  const minDeposit = parseTokenAmount(values.min as string);
  const maxDeposit = parseTokenAmount(values.max as string);
  const duration = parseDuration(values.duration as string);
  const expectedYield = values.yield as string;

  // Display parameters
  console.log('📋 Deal Parameters:');
  console.log(`  Deposit Token:  ${depositToken} (${depositAddress})`);
  console.log(`  Target Token:   ${targetToken} (${targetAddress})`);
  console.log(`  Target Chain:   ${targetChainId}`);
  console.log(`  Min Deposit:    ${values.min} ${depositToken}`);
  console.log(`  Max Deposit:    ${values.max} ${depositToken}`);
  console.log(`  Duration:       ${values.duration}`);
  console.log(`  Expected Yield: ${Number(expectedYield) / 100}%`);
  console.log(`  Dealer:         ${dealer}`);
  console.log(`  API Endpoint:   ${API_URL}/api/deals`);
  console.log('');

  try {
    // Create deal via API
    console.log('📝 Creating deal via API...');
    
    const result = await createDealAPI({
      depositToken: depositAddress,
      targetToken: targetAddress,
      targetChainId,
      minDeposit,
      maxDeposit,
      duration: duration.toString(),
      expectedYield,
      dealer,
    });

    console.log('✅ Deal created successfully!\n');
    console.log('📊 Result:');
    console.log(`  Deal ID:    ${result.deal.id}`);
    console.log(`  Tx Hash:    ${result.txHash}`);
    console.log(`  Explorer:   ${result.explorerUrl}`);
    console.log(`  Status:     ${result.deal.status}`);
    console.log('');

    console.log('🎉 Done!');
    console.log('');
    console.log('Next steps:');
    console.log(`  1. LPs can deposit to deal #${result.deal.id}`);
    console.log(`  2. Lock deal: POST /api/deals/${result.deal.id}/lock`);
    console.log(`  3. Create Yellow channel for off-chain trading`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('  - Is the backend server running? (npm run dev)');
    console.log('  - Check DEAL_VAULT_ADDRESS in backend/.env');
    console.log('  - Ensure PRIVATE_KEY_BACKEND has FLR for gas');
    console.log('  - Verify token addresses in the script');
    process.exit(1);
  }
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
