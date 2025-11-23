/**
 * Deal List Component - Shows all available deals
 */

import React, { useState } from "react";
import { formatUnits } from "viem";
import { useDeals } from "../hooks/useDeals";
import { DealStatus, DealStatusLabels } from "../lib/contracts";
import { DepositModal } from "./DepositModal";

export function DealList() {
  const { deals, isLoading } = useDeals();
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active deals found</p>
        <p className="text-sm text-gray-400 mt-2">Admin can create deals from the Admin panel</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map((deal) => (
          <DealCard
            key={deal.dealId.toString()}
            deal={deal}
            onDeposit={() => setSelectedDeal(Number(deal.dealId))}
          />
        ))}
      </div>

      {selectedDeal !== null && (
        <DepositModal
          dealId={selectedDeal}
          isOpen={true}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </>
  );
}

interface DealCardProps {
  deal: any;
  onDeposit: () => void;
}

function DealCard({ deal, onDeposit }: DealCardProps) {
  const isActive = deal.status === DealStatus.Active;
  const totalDeposited = formatUnits(deal.totalDeposited, 6); // USDC decimals
  const expectedYield = Number(deal.expectedYield) / 100; // Convert basis points to percentage

  // Calculate time remaining
  const endTime = Number(deal.startTime) + Number(deal.duration);
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = endTime - now;
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / 86400));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % 86400) / 3600));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Deal #{deal.dealId.toString()}
          </h3>
          <p className="text-sm text-gray-500">Target: Base Chain</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {DealStatusLabels[deal.status]}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Expected APY</span>
          <span className="text-sm font-semibold text-green-600">
            {expectedYield}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Deposited</span>
          <span className="text-sm font-semibold">
            {parseFloat(totalDeposited).toLocaleString()} USDC
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Min Deposit</span>
          <span className="text-sm">
            {formatUnits(deal.minDeposit, 6)} USDC
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Max Deposit</span>
          <span className="text-sm">
            {formatUnits(deal.maxDeposit, 6)} USDC
          </span>
        </div>

        {isActive && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Time Remaining</span>
            <span className="text-sm font-medium text-orange-600">
              {daysRemaining > 0
                ? `${daysRemaining}d ${hoursRemaining}h`
                : `${hoursRemaining}h`}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onDeposit}
        disabled={!isActive}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isActive
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isActive ? "Deposit" : "Deal Closed"}
      </button>
    </div>
  );
}
