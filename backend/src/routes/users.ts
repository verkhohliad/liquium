/**
 * Users API Routes
 */

import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/users/:address
 * Get user profile and activity
 */
router.get("/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();

    const [user, deposits, rewards] = await Promise.all([
      prisma.user.findUnique({ where: { address } }),
      prisma.deposit.findMany({
        where: { userAddress: address },
        include: { deal: true },
      }),
      prisma.reward.findMany({
        where: { userAddress: address },
        include: { deal: true },
      }),
    ]);

    const totalDeposited = deposits.reduce(
      (sum, d) => sum + BigInt(d.amount),
      0n
    );

    const totalRewards = rewards.reduce(
      (sum, r) => sum + BigInt(r.rewardShare),
      0n
    );

    res.json({
      success: true,
      user: user || { address },
      activity: {
        totalDeposits: deposits.length,
        totalDeposited: totalDeposited.toString(),
        activeDeals: new Set(deposits.map((d) => d.dealId)).size,
        totalRewards: totalRewards.toString(),
        yellowChannels: rewards.filter((r) => r.channelId).length,
      },
      deposits,
      rewards,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:address/yellow
 * Update user's Yellow Network address
 */
router.post("/:address/yellow", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { yellowAddress } = req.body;

    if (!yellowAddress) {
      return res.status(400).json({ success: false, error: "yellowAddress required" });
    }

    const user = await prisma.user.upsert({
      where: { address },
      update: { yellowAddress },
      create: {
        address,
        yellowAddress,
      },
    });

    res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:address/positions
 * Get user's NFT positions
 */
router.get("/:address/positions", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();

    const deposits = await prisma.deposit.findMany({
      where: { userAddress: address },
      include: {
        deal: {
          select: {
            dealId: true,
            status: true,
            expectedYield: true,
            startTime: true,
            duration: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    res.json({
      success: true,
      positions: deposits.map((d) => ({
        positionId: d.positionId,
        dealId: d.dealId,
        amount: d.amount,
        timestamp: d.timestamp,
        deal: d.deal,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as usersRouter };
