/**
 * Rewards Panel - Shows user's rewards and Yellow Network channels
 */

import React, { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, RewardDistributorABI } from "../lib/contracts";
import { useDeals, useUserDeposit } from "../hooks/useDeals";
import { YellowTradingModal } from "./YellowTradingModal";

export function RewardsPanel() {
  const { address } = useAccount();
  const { deals } = useDeals();
  const [selectedChannel, setSelectedChannel] = useState<{
    dealId: number;
    channelId: string;
    balance: bigint;
  } | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">My Rewards</h2>

        {deals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No deals available. Deposit into a deal to earn rewards!
          </p>
        ) : (
          <div className="space-y-4">
            {deals.map((deal) => (
              <UserRewardCard
                key={deal.dealId.toString()}
                dealId={Number(deal.dealId)}
                userAddress={address}
                onViewChannel={(channelId, balance) =>
                  setSelectedChannel({
                    dealId: Number(deal.dealId),
                    channelId,
                    balance,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {selectedChannel && (
        <YellowTradingModal
          isOpen={true}
          onClose={() => setSelectedChannel(null)}
          dealId={selectedChannel.dealId}
          channelId={selectedChannel.channelId}
          balance={selectedChannel.balance}
        />
      )}
    </div>
  );
}

interface UserRewardCardProps {
  dealId: number;
  userAddress?: `0x${string}`;
  onViewChannel: (channelId: string, balance: bigint) => void;
}

function UserRewardCard({ dealId, userAddress, onViewChannel }: UserRewardCardProps) {
  const { userDeposit } = useUserDeposit(dealId, userAddress);

  // Get Yellow channel for this user
  const { data: channelData } = useReadContract({
    address: CONTRACTS.RewardDistributor,
    abi: RewardDistributorABI,
    functionName: "getUserRewardChannelInfo",
    args: userAddress ? [BigInt(dealId), userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  if (!userDeposit || userDeposit.amount === 0n) {
    return null; // User hasn't deposited in this deal
  }

  const depositAmount = formatUnits(userDeposit.amount, 6);
  const rewardShare = formatUnits(userDeposit.rewardShare, 6);
  const hasRewards = userDeposit.rewardShare > 0n;

  // Extract channel info
  const channelId = channelData ? channelData[0] as string : null;
  const commitment = channelData ? channelData[1] : null;
  const channelBalance = commitment ? (commitment as any).balance1 : 0n;
  const hasChannel = channelId && channelId !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Deal #{dealId}</h3>
          <p className="text-sm text-gray-500">Your deposit: {parseFloat(depositAmount).toLocaleString()} USDC</p>
        </div>
        {hasRewards && (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
            Rewards Available
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {hasRewards && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reward Share</span>
            <span className="font-semibold text-green-600">
              +{parseFloat(rewardShare).toLocaleString()} USDC
            </span>
          </div>
        )}

        {hasChannel ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Yellow Channel</span>
              <span className="font-mono text-xs">
                {channelId?.slice(0, 10)}...
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Channel Balance</span>
              <span className="font-semibold">
                {formatUnits(channelBalance, 6)} USDC
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500 italic">
            {hasRewards ? "Rewards not distributed to Yellow yet" : "No rewards yet"}
          </div>
        )}
      </div>

      {hasChannel && (
        <button
          onClick={() => onViewChannel(channelId!, channelBalance)}
          className="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>⚡</span>
          <span>Trade on Yellow Network</span>
        </button>
      )}
    </div>
  );
}
