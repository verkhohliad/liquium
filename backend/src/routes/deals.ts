/**
 * Deals API Routes
 */

import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/deals
 * Get all deals with optional status filter
 */
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    const deals = await prisma.deal.findMany({
      where: status ? { status: status as string } : undefined,
      include: {
        deposits: {
          select: {
            userAddress: true,
            amount: true,
            timestamp: true,
          },
        },
        _count: {
          select: {
            deposits: true,
          },
        },
      },
      orderBy: {
        dealId: "desc",
      },
    });

    res.json({
      success: true,
      deals,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals/:dealId
 * Get single deal by ID
 */
router.get("/:dealId", async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);

    const deal = await prisma.deal.findUnique({
      where: { dealId },
      include: {
        deposits: {
          include: {
            deal: true,
          },
        },
        rewards: true,
      },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: "Deal not found" });
    }

    res.json({
      success: true,
      deal,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals/:dealId/stats
 * Get deal statistics
 */
router.get("/:dealId/stats", async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);

    const [deal, deposits, rewards] = await Promise.all([
      prisma.deal.findUnique({ where: { dealId } }),
      prisma.deposit.findMany({ where: { dealId } }),
      prisma.reward.findMany({ where: { dealId } }),
    ]);

    if (!deal) {
      return res.status(404).json({ success: false, error: "Deal not found" });
    }

    const uniqueDepositors = new Set(deposits.map((d) => d.userAddress)).size;
    const totalRewards = rewards.reduce(
      (sum, r) => sum + BigInt(r.rewardShare),
      0n
    );
    const distributedRewards = rewards.filter((r) => r.distributed).length;

    res.json({
      success: true,
      stats: {
        dealId,
        totalDeposits: deposits.length,
        uniqueDepositors,
        totalDeposited: deal.totalDeposited,
        totalRewards: totalRewards.toString(),
        rewardsDistributed: distributedRewards,
        status: deal.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals/:dealId/depositors
 * Get all depositors for a deal
 */
router.get("/:dealId/depositors", async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);

    const deposits = await prisma.deposit.findMany({
      where: { dealId },
      select: {
        userAddress: true,
        amount: true,
        timestamp: true,
        positionId: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Group by user and sum amounts
    const depositorMap = new Map<string, any>();

    deposits.forEach((deposit) => {
      if (depositorMap.has(deposit.userAddress)) {
        const existing = depositorMap.get(deposit.userAddress);
        existing.totalAmount = (
          BigInt(existing.totalAmount) + BigInt(deposit.amount)
        ).toString();
        existing.deposits.push(deposit);
      } else {
        depositorMap.set(deposit.userAddress, {
          address: deposit.userAddress,
          totalAmount: deposit.amount,
          deposits: [deposit],
        });
      }
    });

    const depositors = Array.from(depositorMap.values());

    res.json({
      success: true,
      depositors,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as dealsRouter };
