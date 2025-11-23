/**
 * Rewards API Routes
 */

import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/rewards/user/:address
 * Get all rewards for a user across all deals
 */
router.get("/user/:address", async (req, res) => {
  try {
    const userAddress = req.params.address.toLowerCase();

    const rewards = await prisma.reward.findMany({
      where: { userAddress },
      include: {
        deal: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalRewards = rewards.reduce(
      (sum, r) => sum + BigInt(r.rewardShare),
      0n
    );

    res.json({
      success: true,
      rewards,
      summary: {
        totalRewards: totalRewards.toString(),
        totalDeals: rewards.length,
        distributedChannels: rewards.filter((r) => r.channelId).length,
        claimedRewards: rewards.filter((r) => r.claimed).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rewards/deal/:dealId
 * Get all rewards for a specific deal
 */
router.get("/deal/:dealId", async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);

    const rewards = await prisma.reward.findMany({
      where: { dealId },
      orderBy: {
        rewardShare: "desc",
      },
    });

    const totalRewards = rewards.reduce(
      (sum, r) => sum + BigInt(r.rewardShare),
      0n
    );

    res.json({
      success: true,
      rewards,
      summary: {
        totalRewards: totalRewards.toString(),
        totalUsers: rewards.length,
        distributed: rewards.filter((r) => r.distributed).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rewards/channel/:channelId
 * Get reward info by Yellow channel ID
 */
router.get("/channel/:channelId", async (req, res) => {
  try {
    const channelId = req.params.channelId;

    const reward = await prisma.reward.findFirst({
      where: { channelId },
      include: {
        deal: true,
      },
    });

    if (!reward) {
      return res.status(404).json({ success: false, error: "Channel not found" });
    }

    res.json({
      success: true,
      reward,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as rewardsRouter };
