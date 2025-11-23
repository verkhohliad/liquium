/**
 * Yellow Trading Modal - MOCK for PoC Demo
 * Simulates trading on Yellow Network without actual integration
 */

import React, { useState } from "react";
import { formatUnits, parseUnits } from "viem";

interface YellowTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: number;
  channelId: string;
  balance: bigint;
}

const MOCK_TOKENS = [
  { symbol: "USDC", name: "USD Coin", price: 1.0, decimals: 6 },
  { symbol: "BTC", name: "Bitcoin", price: 45000, decimals: 8 },
  { symbol: "ETH", name: "Ethereum", price: 2500, decimals: 18 },
  { symbol: "FLR", name: "Flare", price: 0.025, decimals: 18 },
];

export function YellowTradingModal({
  isOpen,
  onClose,
  dealId,
  channelId,
  balance,
}: YellowTradingModalProps) {
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTrad

ing, setIsTrading] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [mockBalance, setMockBalance] = useState(balance);

  if (!isOpen) return null;

  const fromTokenInfo = MOCK_TOKENS.find((t) => t.symbol === fromToken);
  const toTokenInfo = MOCK_TOKENS.find((t) => t.symbol === toToken);

  const calculateReceive = () => {
    if (!amount || !fromTokenInfo || !toTokenInfo) return "0";
    const amountNum = parseFloat(amount);
    const received = (amountNum * fromTokenInfo.price) / toTokenInfo.price;
    return received.toFixed(8);
  };

  const handleConnect = () => {
    // Simulate connection to Yellow Network
    setTimeout(() => {
      setIsConnected(true);
    }, 1500);
  };

  const handleTrade = () => {
    // Simulate trade execution
    setIsTrading(true);

    setTimeout(() => {
      setIsTrading(false);
      setTradeSuccess(true);

      // Mock: Update balance (subtract traded amount)
      const amountWei = parseUnits(amount, 6);
      setMockBalance(mockBalance - amountWei);

      setTimeout(() => {
        setTradeSuccess(false);
        setAmount("");
      }, 3000);
    }, 2000);
  };

  const balanceFormatted = formatUnits(mockBalance, 6);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Yellow Network Trading</h2>
            <p className="text-sm text-gray-500">Off-chain state channel trading</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* PoC Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-yellow-800 font-medium">
            ⚡ Demo Mode - Simulated Yellow Network
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            This is a PoC demonstration. Actual Yellow Network integration requires their infrastructure.
          </p>
        </div>

        {/* Channel Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Channel ID</span>
              <p className="font-mono text-xs mt-1">{channelId.slice(0, 20)}...</p>
            </div>
            <div>
              <span className="text-gray-600">Deal #</span>
              <p className="font-medium mt-1">{dealId}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Available Balance</span>
              <p className="font-semibold text-lg text-green-600 mt-1">
                {parseFloat(balanceFormatted).toLocaleString()} USDC
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full">
                <span className="text-3xl">⚡</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect to Yellow Network</h3>
            <p className="text-sm text-gray-600 mb-6">
              Connect your channel to start trading instantly
            </p>
            <button
              onClick={handleConnect}
              className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
            >
              Connect Channel
            </button>
          </div>
        ) : (
          <div>
            {/* Connection Badge */}
            <div className="flex items-center justify-center gap-2 mb-6 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-medium">Connected to Yellow Network</span>
            </div>

            {/* Trading Interface */}
            <div className="space-y-4">
              {/* From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <div className="flex gap-2">
                  <select
                    value={fromToken}
                    onChange={(e) => setFromToken(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {MOCK_TOKENS.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Swap Icon */}
              <div className="flex justify-center">
                <div className="bg-gray-100 p-2 rounded-full">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <div className="flex gap-2">
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {MOCK_TOKENS.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={calculateReceive()}
                    readOnly
                    placeholder="0.00"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              {/* Price Info */}
              {amount && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rate</span>
                    <span className="font-medium">
                      1 {fromToken} ≈ {((fromTokenInfo?.price || 0) / (toTokenInfo?.price || 1)).toFixed(8)} {toToken}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Network Fee</span>
                    <span className="text-green-600">FREE (off-chain)</span>
                  </div>
                </div>
              )}

              {/* Trade Status */}
              {tradeSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  ✅ Trade executed instantly! State updated off-chain.
                </div>
              )}

              {/* Trade Button */}
              <button
                onClick={handleTrade}
                disabled={!amount || isTrading || tradeSuccess}
                className="w-full bg-yellow-500 text-white py-3 rounded-lg font-medium hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isTrading ? "Executing Trade..." : tradeSuccess ? "Trade Complete!" : "Execute Trade"}
              </button>

              {/* Info */}
              <p className="text-xs text-gray-500 text-center">
                💡 Trades execute instantly via state channels - no gas fees, sub-second finality
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
