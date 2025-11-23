/**
 * Deposit Modal Component - Handles user deposits into deals
 */

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useDeal } from "../hooks/useDeals";
import { useUSDCBalance, useUSDCAllowance, useApproveUSDC, useDeposit } from "../hooks/useDeposit";

interface DepositModalProps {
  dealId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ dealId, isOpen, onClose }: DepositModalProps) {
  const { address } = useAccount();
  const { deal } = useDeal(dealId);
  const { balance } = useUSDCBalance(address);
  const { allowance, refetch: refetchAllowance } = useUSDCAllowance(address);

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "approve" | "deposit">("input");

  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveUSDC();
  const { deposit, isPending: isDepositing, isSuccess: depositSuccess } = useDeposit();

  // Check if approval is needed
  const needsApproval = allowance !== undefined && parseUnits(amount || "0", 6) > allowance;

  // Handle approve success
  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
      setStep("deposit");
    }
  }, [approveSuccess, refetchAllowance]);

  // Handle deposit success
  useEffect(() => {
    if (depositSuccess) {
      setTimeout(() => {
        onClose();
        setAmount("");
        setStep("input");
      }, 2000);
    }
  }, [depositSuccess, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!amount || !deal) return;

    const amountNum = parseFloat(amount);
    const minDeposit = parseFloat(formatUnits(deal.minDeposit, 6));
    const maxDeposit = parseFloat(formatUnits(deal.maxDeposit, 6));

    if (amountNum < minDeposit || amountNum > maxDeposit) {
      alert(`Amount must be between ${minDeposit} and ${maxDeposit} USDC`);
      return;
    }

    if (needsApproval) {
      setStep("approve");
      approve(amount);
    } else {
      setStep("deposit");
      deposit(dealId, amount);
    }
  };

  const balanceFormatted = balance ? formatUnits(balance, 6) : "0";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Deposit USDC</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Deal Info */}
          {deal && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Expected APY</span>
                <span className="font-semibold text-green-600">
                  {Number(deal.expectedYield) / 100}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Min - Max Deposit</span>
                <span>
                  {formatUnits(deal.minDeposit, 6)} - {formatUnits(deal.maxDeposit, 6)} USDC
                </span>
              </div>
            </div>
          )}

          {/* Balance */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Your USDC Balance</span>
            <span className="font-medium">{parseFloat(balanceFormatted).toLocaleString()} USDC</span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Deposit
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={step !== "input"}
              />
              <button
                onClick={() => setAmount(balanceFormatted)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={step !== "input"}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {step === "approve" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              {isApproving ? "⏳ Approving USDC..." : "✅ Approval confirmed!"}
            </div>
          )}

          {step === "deposit" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              {isDepositing ? "⏳ Processing deposit..." : depositSuccess ? "✅ Deposit successful!" : "Ready to deposit"}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSubmit}
            disabled={!amount || isApproving || isDepositing || depositSuccess}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {step === "input" && needsApproval && "Approve & Deposit"}
            {step === "input" && !needsApproval && "Deposit"}
            {step === "approve" && isApproving && "Approving..."}
            {step === "deposit" && isDepositing && "Depositing..."}
            {depositSuccess && "Success!"}
          </button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            You'll receive a Position NFT representing your deposit
          </p>
        </div>
      </div>
    </div>
  );
}
