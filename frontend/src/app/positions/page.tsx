'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { useAccount } from 'wagmi';
import { mockPositions, calculatePortfolioSummary } from '@/lib/mockData';
import Link from 'next/link';

export default function PositionsPage() {
  const { address } = useAccount();
  const [showClaimed, setShowClaimed] = useState(false);
  
  // Use mock data for demo
  const positions = address ? mockPositions : [];
  const summary = calculatePortfolioSummary(positions);
  
  // Filter positions based on showClaimed toggle
  const filteredPositions = showClaimed 
    ? positions 
    : positions.filter(p => p.status !== 'claimed');

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">My Positions</h1>
          <p className="text-gray-400">Connect your wallet to view your positions</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Positions</h1>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Value */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="text-sm text-gray-400 mb-2">Total Portfolio Value</div>
            <div className="text-3xl font-bold mb-1">${summary.totalValue}</div>
            <div className="text-sm text-gray-400">
              Deposited: ${summary.totalDeposited}
            </div>
          </div>

          {/* Total PnL */}
          <div className={`p-6 rounded-xl border ${
            parseFloat(summary.totalPnL) >= 0 
              ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20'
              : 'bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20'
          }`}>
            <div className="text-sm text-gray-400 mb-2">Total Profit/Loss</div>
            <div className={`text-3xl font-bold mb-1 ${
              parseFloat(summary.totalPnL) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {parseFloat(summary.totalPnL) >= 0 ? '+' : ''}${summary.totalPnL}
            </div>
            <div className={`text-sm ${
              parseFloat(summary.totalPnL) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {parseFloat(summary.totalPnLPercentage) >= 0 ? '+' : ''}{summary.totalPnLPercentage}%
            </div>
          </div>

          {/* Active Positions */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <div className="text-sm text-gray-400 mb-2">Active Positions</div>
            <div className="text-3xl font-bold mb-1">{summary.activePositions}</div>
            <div className="text-sm text-gray-400">
              Total: {summary.totalPositions} positions
            </div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowClaimed(!showClaimed)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
          >
            {showClaimed ? 'Hide' : 'Show'} Claimed Positions
          </button>
        </div>

        {/* Positions List */}
        {filteredPositions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">No positions found</div>
            <Link 
              href="/deals"
              className="inline-block px-6 py-3 bg-gradient-purple rounded-lg hover:opacity-90 transition"
            >
              Browse Deals
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredPositions.map((position) => (
              <div
                key={position.id}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">
                        {position.token} on {position.chain}
                      </h3>
                      <div className="text-sm text-gray-400">
                        APY: <span className="text-purple-400 font-semibold">{position.apy}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm mb-2 ${
                      position.status === 'active' ? 'bg-green-500/10 text-green-500' :
                      position.status === 'pending_claim' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {position.status === 'active' ? 'Active' :
                       position.status === 'pending_claim' ? 'Pending Claim' : 'Claimed'}
                    </div>
                    {position.status !== 'claimed' && (
                      <div className={`text-lg font-bold ${
                        position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-400">Deposited</div>
                    <div className="font-semibold">${position.depositAmount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Current Value</div>
                    <div className="font-semibold">${position.currentValue}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Profit/Loss</div>
                    <div className={`font-semibold ${
                      position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnlAmount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Deposited</div>
                    <div className="font-semibold">
                      {position.depositedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {position.status === 'pending_claim' && (
                    <button
                      className="flex-1 px-6 py-2 bg-gradient-purple rounded-lg hover:opacity-90 transition text-sm font-semibold"
                      onClick={() => alert('Claim functionality - Demo only')}
                    >
                      Claim Rewards
                    </button>
                  )}
                  {position.status === 'active' && (
                    <button
                      className="flex-1 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm font-semibold"
                      onClick={() => alert('Withdraw functionality - Demo only')}
                    >
                      Withdraw
                    </button>
                  )}
                  <Link
                    href={`/deals/${position.dealId}`}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm font-semibold text-center"
                  >
                    View Deal
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
