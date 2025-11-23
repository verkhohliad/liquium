/**
 * Admin Panel - Manage deals, deposits to protocol, and reward distribution
 */

import React, { useState } from "react";
import { formatUnits } from "viem";
import { useDeals } from "../hooks/useDeals";
import {
  useCreateDeal,
  useLockDeal,
  useDepositToProtocol,
  useClaimRewards,
  useDistributeRewards,
} from "../hooks/useAdmin";
import { TEST_USDC, DealStatus, DealStatusLabels } from "../lib/contracts";

export function AdminPanel() {
  const { deals, refetch } = useDeals();
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Admin Panel</h2>
            <p className="text-sm text-gray-600">Manage deals and rewards</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            {showCreateForm ? "Cancel" : "+ Create Deal"}
          </button>
        </div>
      </div>

      {/* Create Deal Form */}
      {showCreateForm && (
        <CreateDealForm
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }}
        />
      )}

      {/* Deals Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Active Deals</h3>
        <div className="space-y-4">
          {deals.map((deal) => (
            <DealManagementCard
              key={deal.dealId.toString()}
              deal={deal}
              onUpdate={refetch}
            />
          ))}
          {deals.length === 0 && (
            <p className="text-gray-500 text-center py-8">No deals created yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateDealForm({ onSuccess }: { onSuccess: () => void }) {
  const { createDeal, isPending, isSuccess } = useCreateDeal();
  const [formData, setFormData] = useState({
    minDeposit: "10",
    maxDeposit: "1000",
    durationDays: "30",
    expectedYield: "1000", // 10% in basis points
  });

  React.useEffect(() => {
    if (isSuccess) {
      setTimeout(onSuccess, 2000);
    }
  }, [isSuccess, onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDeal({
      depositToken: TEST_USDC,
      targetToken: "0x0000000000000000000000000000000000000000", // Placeholder
      targetChainId: 8453, // Base mainnet
      minDeposit: formData.minDeposit,
      maxDeposit: formData.maxDeposit,
      durationDays: parseInt(formData.durationDays),
      expectedYieldBps: parseInt(formData.expectedYield),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Create New Deal</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Deposit (USDC)
            </label>
            <input
              type="number"
              value={formData.minDeposit}
              onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Deposit (USDC)
            </label>
            <input
              type="number"
              value={formData.maxDeposit}
              onChange={(e) => setFormData({ ...formData, maxDeposit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (Days)
            </label>
            <input
              type="number"
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Yield (%)
            </label>
            <input
              type="number"
              value={parseInt(formData.expectedYield) / 100}
              onChange={(e) =>
                setFormData({ ...formData, expectedYield: (parseFloat(e.target.value) * 100).toString() })
              }
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || isSuccess}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {isPending ? "Creating..." : isSuccess ? "Created!" : "Create Deal"}
        </button>
      </form>
    </div>
  );
}

interface DealManagementCardProps {
  deal: any;
  onUpdate: () => void;
}

function DealManagementCard({ deal, onUpdate }: DealManagementCardProps) {
  const { lockDeal, isPending: isLocking } = useLockDeal();
  const { depositToProtocol, isPending: isDepositing } = useDepositToProtocol();
  const { claimRewards, isPending: isClaiming } = useClaimRewards();
  const { distributeRewards, isPending: isDistributing } = useDistributeRewards();

  const dealId = Number(deal.dealId);
  const totalDeposited = formatUnits(deal.totalDeposited, 6);
  const isActive = deal.status === DealStatus.Active;
  const isLocked = deal.status === DealStatus.Locked;

  const handleAction = (action: () => void) => {
    action();
    setTimeout(onUpdate, 3000);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold">Deal #{dealId}</h4>
          <p className="text-sm text-gray-600">
            Total Deposited: {parseFloat(totalDeposited).toLocaleString()} USDC
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isActive ? "bg-green-100 text-green-800" :
          isLocked ? "bg-yellow-100 text-yellow-800" :
          "bg-gray-100 text-gray-800"
        }`}>
          {DealStatusLabels[deal.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Lock Deal */}
        <button
          onClick={() => handleAction(() => lockDeal(dealId))}
          disabled={!isActive || isLocking}
          className="px-3 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLocking ? "Locking..." : "Lock Deal"}
        </button>

        {/* Deposit to Protocol */}
        <button
          onClick={() => handleAction(() => depositToProtocol(dealId))}
          disabled={!isLocked || isDepositing}
          className="px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isDepositing ? "Depositing..." : "→ Protocol"}
        </button>

        {/* Claim Rewards */}
        <button
          onClick={() => handleAction(() => claimRewards(dealId))}
          disabled={!isLocked || isClaiming}
          className="px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isClaiming ? "Claiming..." : "Claim Rewards"}
        </button>

        {/* Distribute to Yellow */}
        <button
          onClick={() => handleAction(() => distributeRewards(dealId))}
          disabled={!isLocked || isDistributing}
          className="px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isDistributing ? "Distributing..." : "⚡ Distribute"}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        💡 Flow: Lock → Deposit to Protocol → (wait) → Claim Rewards → Distribute to Yellow
      </p>
    </div>
  );
}
