'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { DepositModal } from '@/components/DepositModal';
import { mockDeals, type MockDeal } from '@/lib/mockData';

export default function DealsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<MockDeal | undefined>();
  const [filter, setFilter] = useState<string>('all');
  
  // Use mock data for demo
  const deals = mockDeals;
  
  // Filter deals
  const filteredDeals = filter === 'all' 
    ? deals 
    : deals.filter(d => d.status === filter);

  const handleDeposit = (deal: MockDeal) => {
    setSelectedDeal(deal);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Active Deals</h1>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
            <option value="settled">Settled</option>
          </select>
        </div>

        {filteredDeals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">No deals found</div>
            <p className="text-sm text-gray-500">
              Try changing the filter
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{deal.name}</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                      deal.status === 'active' ? 'bg-green-500/10 text-green-500' :
                      deal.status === 'locked' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {deal.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-400">
                      {deal.apy}%
                    </div>
                    <div className="text-sm text-gray-400">APY</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-400">Asset</div>
                    <div className="font-semibold">{deal.depositToken}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Chain</div>
                    <div className="font-semibold">{deal.chain}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">TVL</div>
                    <div className="font-semibold">${deal.tvl}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Min Deposit</div>
                    <div className="font-semibold">{deal.minDeposit} {deal.depositToken}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {deal.status === 'active' && (
                    <button
                      onClick={() => handleDeposit(deal)}
                      className="flex-1 px-6 py-3 bg-gradient-purple rounded-lg font-semibold hover:opacity-90 transition"
                    >
                      Deposit {deal.depositToken}
                    </button>
                  )}
                  <button
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
                    onClick={() => alert(`View details for ${deal.name}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deal={selectedDeal}
      />
    </div>
  );
}
