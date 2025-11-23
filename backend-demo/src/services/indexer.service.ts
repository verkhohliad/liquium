import { ethers } from 'ethers'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { CONTRACTS, RPC_URL } from '../config/contracts'
import DealVaultABI from '../contracts/DealVault.json'

const prisma = new PrismaClient()

export async function startIndexer() {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const currentBlock = await provider.getBlockNumber()

  logger.info(`Starting indexer from block ${currentBlock}`)
  logger.info(`Connected to Flare Mainnet RPC: ${RPC_URL}`)

  // Index DealVault events
  await indexDealVaultEvents(provider, currentBlock)

  logger.info('✅ Indexer started successfully')
}

async function indexDealVaultEvents(provider: ethers.Provider, fromBlock: number) {
  const dealVault = new ethers.Contract(
    CONTRACTS.DEAL_VAULT,
    DealVaultABI,
    provider
  )

  // Listen to DealCreated events
  dealVault.on('DealCreated', async (dealId, depositToken, duration, event) => {
    logger.info(`📊 DealCreated: Deal #${dealId}`)

    try {
      // Fetch full deal data from contract
      const dealData = await dealVault.getDeal(dealId)

      await prisma.deal.upsert({
        where: { dealId: Number(dealId) },
        create: {
          dealId: Number(dealId),
          depositToken: depositToken,
          minDeposit: dealData.minDeposit.toString(),
          maxDeposit: dealData.maxDeposit.toString(),
          totalDeposited: dealData.totalDeposited.toString(),
          startTime: new Date(Number(dealData.startTime) * 1000),
          duration: Number(dealData.duration),
          status: mapDealStatus(Number(dealData.status)),
          expectedYield: Number(dealData.expectedYield),
          channelId: dealData.channelId !== ethers.ZeroHash ? dealData.channelId : null,
        },
        update: {},
      })

      // Log event
      await logEvent(event, 'DealCreated', {
        dealId: Number(dealId),
        depositToken,
        duration: Number(duration),
      })
    } catch (error) {
      logger.error('Error processing DealCreated event:', error)
    }
  })

  // Listen to Deposited events
  dealVault.on('Deposited', async (dealId, depositor, positionId, amount, event) => {
    logger.info(`💰 Deposited: Deal #${dealId}, User ${depositor}, Amount ${ethers.formatUnits(amount, 6)} USDC`)

    try {
      // Create deposit record
      await prisma.deposit.upsert({
        where: { positionId: Number(positionId) },
        create: {
          dealId: Number(dealId),
          userAddress: depositor.toLowerCase(),
          amount: amount.toString(),
          positionId: Number(positionId),
          txHash: event.log.transactionHash!,
          blockNumber: event.log.blockNumber,
          timestamp: new Date((await event.getBlock()).timestamp * 1000),
        },
        update: {},
      })

      // Update deal total deposited
      const dealData = await dealVault.getDeal(dealId)
      await prisma.deal.update({
        where: { dealId: Number(dealId) },
        data: { totalDeposited: dealData.totalDeposited.toString() },
      })

      // Log event
      await logEvent(event, 'Deposited', {
        dealId: Number(dealId),
        depositor,
        positionId: Number(positionId),
        amount: amount.toString(),
      })
    } catch (error) {
      logger.error('Error processing Deposited event:', error)
    }
  })

  // Listen to DealLocked events
  dealVault.on('DealLocked', async (dealId, channelId, event) => {
    logger.info(`🔒 DealLocked: Deal #${dealId}`)

    try {
      await prisma.deal.update({
        where: { dealId: Number(dealId) },
        data: {
          status: 'Locked',
          channelId: channelId !== ethers.ZeroHash ? channelId : null,
        },
      })

      await logEvent(event, 'DealLocked', {
        dealId: Number(dealId),
        channelId,
      })
    } catch (error) {
      logger.error('Error processing DealLocked event:', error)
    }
  })

  // Listen to RewardsClaimedFromProtocol events
  dealVault.on('RewardsClaimedFromProtocol', async (dealId, protocol, rewards, event) => {
    logger.info(`🎁 RewardsClaimed: Deal #${dealId}, Rewards ${ethers.formatUnits(rewards, 6)} USDC`)

    try {
      // Get all depositors and calculate their rewards
      const deposits = await prisma.deposit.findMany({
        where: { dealId: Number(dealId) },
      })

      const totalDeposited = deposits.reduce((sum, d) => sum + BigInt(d.amount), 0n)

      for (const deposit of deposits) {
        const userShare = (BigInt(deposit.amount) * BigInt(rewards)) / totalDeposited

        await prisma.reward.upsert({
          where: {
            dealId_userAddress: {
              dealId: Number(dealId),
              userAddress: deposit.userAddress,
            },
          },
          create: {
            dealId: Number(dealId),
            userAddress: deposit.userAddress,
            rewardAmount: userShare.toString(),
          },
          update: {
            rewardAmount: userShare.toString(),
          },
        })
      }

      await logEvent(event, 'RewardsClaimedFromProtocol', {
        dealId: Number(dealId),
        protocol,
        rewards: rewards.toString(),
      })
    } catch (error) {
      logger.error('Error processing RewardsClaimed event:', error)
    }
  })

  logger.info('✅ DealVault event listeners registered')
}

// Yellow Network integration removed - no longer indexing RewardDistributor events
// Users now withdraw rewards directly via DealVault.withdraw(positionId)

async function logEvent(event: any, eventName: string, args: any) {
  try {
    await prisma.eventLog.create({
      data: {
        eventName,
        contractAddress: event.log.address.toLowerCase(),
        txHash: event.log.transactionHash!,
        blockNumber: event.log.blockNumber,
        logIndex: event.log.index,
        args: JSON.stringify(args),
        timestamp: new Date((await event.getBlock()).timestamp * 1000),
      },
    })
  } catch (error) {
    // Ignore duplicate key errors
    if (!(error as any).code === 'P2002') {
      logger.error('Error logging event:', error)
    }
  }
}

function mapDealStatus(status: number): 'Active' | 'Locked' | 'Settling' | 'Finalized' | 'Cancelled' {
  const statuses = ['Active', 'Locked', 'Settling', 'Finalized', 'Cancelled'] as const
  return statuses[status] || 'Active'
}
