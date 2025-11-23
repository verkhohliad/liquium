import express from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/deals - Get all deals
router.get('/', async (req, res) => {
  try {
    const { status, limit = '20', offset = '0' } = req.query

    const where = status ? { status: status as any } : {}

    const deals = await prisma.deal.findMany({
      where,
      include: {
        deposits: true,
        rewards: true,
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.deal.count({ where })

    res.json({
      deals,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    })
  } catch (error) {
    logger.error('Error fetching deals:', error)
    res.status(500).json({ error: 'Failed to fetch deals' })
  }
})

// GET /api/deals/:id - Get single deal
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deal = await prisma.deal.findUnique({
      where: { dealId: parseInt(id) },
      include: {
        deposits: {
          orderBy: { timestamp: 'desc' },
        },
        rewards: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' })
    }

    // Calculate stats
    const depositorCount = deal.deposits.length
    const totalRewards = deal.rewards.reduce(
      (sum, r) => sum + BigInt(r.rewardAmount),
      0n
    )

    res.json({
      deal,
      stats: {
        depositorCount,
        totalRewards: totalRewards.toString(),
        averageDeposit: depositorCount > 0
          ? (BigInt(deal.totalDeposited) / BigInt(depositorCount)).toString()
          : '0',
      },
    })
  } catch (error) {
    logger.error('Error fetching deal:', error)
    res.status(500).json({ error: 'Failed to fetch deal' })
  }
})

// GET /api/deals/:id/depositors - Get all depositors for a deal
router.get('/:id/depositors', async (req, res) => {
  try {
    const { id } = req.params

    const deposits = await prisma.deposit.findMany({
      where: { dealId: parseInt(id) },
      orderBy: { timestamp: 'desc' },
    })

    res.json({ deposits })
  } catch (error) {
    logger.error('Error fetching depositors:', error)
    res.status(500).json({ error: 'Failed to fetch depositors' })
  }
})

// GET /api/deals/:id/rewards - Get rewards breakdown for a deal
router.get('/:id/rewards', async (req, res) => {
  try {
    const { id } = req.params

    const rewards = await prisma.reward.findMany({
      where: { dealId: parseInt(id) },
      orderBy: { rewardAmount: 'desc' },
    })

    const totalRewards = rewards.reduce((sum, r) => sum + BigInt(r.rewardAmount), 0n)
    const claimedRewards = rewards
      .filter((r) => r.claimed)
      .reduce((sum, r) => sum + BigInt(r.rewardAmount), 0n)

    res.json({
      rewards,
      stats: {
        totalRewards: totalRewards.toString(),
        claimedRewards: claimedRewards.toString(),
        unclaimedRewards: (totalRewards - claimedRewards).toString(),
        userCount: rewards.length,
      },
    })
  } catch (error) {
    logger.error('Error fetching rewards:', error)
    res.status(500).json({ error: 'Failed to fetch rewards' })
  }
})

// GET /api/deals/user/:address - Get deals user participated in
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params

    const deposits = await prisma.deposit.findMany({
      where: { userAddress: address.toLowerCase() },
      include: { deal: true },
      orderBy: { timestamp: 'desc' },
    })

    const deals = deposits.map((d) => ({
      ...d.deal,
      userDeposit: {
        amount: d.amount,
        positionId: d.positionId,
        timestamp: d.timestamp,
      },
    }))

    res.json({ deals })
  } catch (error) {
    logger.error('Error fetching user deals:', error)
    res.status(500).json({ error: 'Failed to fetch user deals' })
  }
})

export { router as dealRoutes }
