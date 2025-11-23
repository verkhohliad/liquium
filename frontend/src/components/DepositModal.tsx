'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supportedChains, supportedTokens, type MockDeal } from '@/lib/mockData';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: MockDeal;
}

export function DepositModal({ isOpen, onClose, deal }: DepositModalProps) {
  const { address, isConnected } = useAccount();
  const [selectedChain, setSelectedChain] = useState(supportedChains[0].id);
  const [selectedToken, setSelectedToken] = useState(supportedTokens[0].symbol);
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && deal) {
      const chain = supportedChains.find(c => c.id === deal.chainId);
      if (chain) setSelectedChain(chain.id);
      setSelectedToken(deal.depositToken);
      setAmount('');
    }
  }, [isOpen, deal]);

  const handleDeposit = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    
    // Simulate deposit transaction
    setTimeout(() => {
      setIsDepositing(false);
      alert(`Successfully deposited ${amount} ${selectedToken}!\n\nThis is a demo - no real transaction was made.`);
      onClose();
    }, 2000);
  };

  const selectedChainData = supportedChains.find(c => c.id === selectedChain);
  const selectedTokenData = supportedTokens.find(t => t.symbol === selectedToken);
  
  // Calculate estimated returns (30 days)
  const estimatedReturns = amount && deal 
    ? (parseFloat(amount) * deal.apy / 100 / 12).toFixed(2)
    : '0.00';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold">Deposit Funds</h2>
            {deal && (
              <p className="text-sm text-gray-400 mt-1">{deal.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Chain Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Chain
            </label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {supportedChains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Token Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Asset
            </label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {supportedTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Deposit Amount
              </label>
              {deal && (
                <span className="text-sm text-gray-400">
                  Min: {deal.minDeposit} {selectedToken}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-20"
              />
              <button
                onClick={() => setAmount('1000')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Transaction Summary */}
          {deal && amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-3 border border-gray-700">
              <h3 className="font-semibold text-purple-400">Transaction Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">APY</span>
                  <span className="font-semibold">{deal.apy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. Monthly Returns</span>
                  <span className="font-semibold text-green-400">
                    +{estimatedReturns} {selectedToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain</span>
                  <span className="font-semibold">
                    {selectedChainData?.icon} {selectedChainData?.name}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Total Deposit</span>
                  <span className="font-bold text-lg">
                    {amount} {selectedToken}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Connect Wallet Message */}
          {!isConnected && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-500">
                Please connect your wallet to deposit
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 space-y-3">
          <button
            onClick={handleDeposit}
            disabled={!isConnected || !amount || parseFloat(amount) <= 0 || isDepositing}
            className="w-full px-6 py-3 bg-gradient-purple rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDepositing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Deposit'
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
