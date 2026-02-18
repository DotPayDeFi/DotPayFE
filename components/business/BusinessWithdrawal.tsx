"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useBusinessFinance } from '@/hooks/useBusinessFinance';
import { useMpesaFlows } from '@/hooks/useMpesaFlows';
import { MpesaTransaction } from '@/types/mpesa';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowUpRight, 
  Smartphone, 
  Wallet, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface BusinessWithdrawalProps {
  onSuccess?: () => void;
}

export const BusinessWithdrawal: React.FC<BusinessWithdrawalProps> = ({ onSuccess }) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const {
    businessBalance,
    withdrawalLoading,
    withdrawalError,
    withdrawToPersonal,
    withdrawToMpesa,
    getBusinessBalance
  } = useBusinessFinance();
  const { getTransaction, pollTransaction } = useMpesaFlows();

  const [activeTab, setActiveTab] = useState<'personal' | 'mpesa'>('personal');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState('USDC');
  const [chain, setChain] = useState('arbitrum');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mpesaTransaction, setMpesaTransaction] = useState<MpesaTransaction | null>(null);
  const [refreshingMpesa, setRefreshingMpesa] = useState(false);

  // Load balance when component mounts
  React.useEffect(() => {
    if (currentBusiness?.businessId) {
      getBusinessBalance(currentBusiness.businessId);
    }
  }, [currentBusiness, getBusinessBalance]);

  const handleWithdrawToPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness?.businessId) {
      toast({
        title: "Error",
        description: "No business account selected",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withdrawToPersonal({
        businessId: currentBusiness.businessId,
        amount: parseFloat(amount),
        tokenType,
        chain
      });

      if (result) {
        toast({
          title: "Transfer Successful",
          description: `Successfully transferred ${amount} ${tokenType} to your personal account`,
        });
        
        setAmount('');
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawToMpesa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness?.businessId) {
      toast({
        title: "Error",
        description: "No business account selected",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withdrawToMpesa({
        businessId: currentBusiness.businessId,
        amount: parseFloat(amount),
        phoneNumber: phoneNumber.trim(),
        tokenType,
        chain
      });

      if (result) {
        setMpesaTransaction(result.transaction);
        toast({
          title: "Withdrawal Initiated",
          description: `Withdrawal of ${amount} ${tokenType} to ${phoneNumber} has been initiated`,
        });
        
        setAmount('');
        setPhoneNumber('');
        if (onSuccess) onSuccess();

        pollTransaction(result.transactionId, {
          intervalMs: 3500,
          timeoutMs: 120000,
          onUpdate: (tx) => setMpesaTransaction(tx),
        }).catch(() => {
          // Manual refresh remains available if polling is interrupted.
        });
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshMpesaStatus = async () => {
    if (!mpesaTransaction?.transactionId) return;
    setRefreshingMpesa(true);
    try {
      const tx = await getTransaction(mpesaTransaction.transactionId);
      setMpesaTransaction(tx);
    } finally {
      setRefreshingMpesa(false);
    }
  };

  const getAvailableBalance = () => {
    if (!businessBalance) return 0;
    
    const chainBalance = businessBalance.balances[chain as keyof typeof businessBalance.balances];
    if (!chainBalance) return 0;
    
    const tokenBalance = chainBalance[tokenType as keyof typeof chainBalance] as any;
    if (!tokenBalance || typeof tokenBalance !== 'object') return 0;
    
    return tokenBalance.balance || 0;
  };

  const availableBalance = getAvailableBalance();

  if (!currentBusiness) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-gray-400">No business account selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Withdraw Funds</h2>
        <p className="text-gray-400">Transfer funds from your business account</p>
      </div>

      {/* Business Balance Display */}
      {businessBalance && (
        <div className="bg-gradient-to-r from-[#0795B0] to-[#0684A0] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Business Balance</p>
              <h3 className="text-2xl font-bold text-white">
                ${businessBalance.overview?.totalUSDValue?.toLocaleString() || '0'}
              </h3>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-white/60">Arbitrum</p>
              <p className="text-white font-medium">
                USDC: {businessBalance.balances.arbitrum?.USDC?.balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-white/60">Base</p>
              <p className="text-white font-medium">
                USDC: {businessBalance.balances.base?.USDC?.balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-white/60">Celo</p>
              <p className="text-white font-medium">
                USDC: {businessBalance.balances.celo?.USDC?.balance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Tabs */}
      <div className="flex space-x-1 bg-[#0795B0]/10 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'personal'
              ? 'bg-[#0795B0] text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#0795B0]/20'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>To Personal Account</span>
        </button>
        <button
          onClick={() => setActiveTab('mpesa')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'mpesa'
              ? 'bg-[#0795B0] text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#0795B0]/20'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>To MPESA</span>
        </button>
      </div>

      {/* Withdrawal Forms */}
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6">
        {activeTab === 'personal' ? (
          <form onSubmit={handleWithdrawToPersonal} className="space-y-4">
            <div className="text-center mb-4">
              <div className="p-3 bg-[#0795B0]/20 rounded-full inline-block mb-2">
                <ArrowUpRight className="h-6 w-6 text-[#0795B0]" />
              </div>
              <h3 className="text-lg font-semibold text-white">Transfer to Personal Account</h3>
              <p className="text-gray-400 text-sm">Move funds to your personal wallet</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={availableBalance}
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available: {availableBalance.toFixed(2)} {tokenType}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token
                </label>
                <select
                  value={tokenType}
                  onChange={(e) => setTokenType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chain
                </label>
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                >
                  <option value="arbitrum">Arbitrum</option>
                  <option value="base">Base</option>
                  <option value="celo">Celo</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || withdrawalLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
              className="w-full bg-[#0795B0] hover:bg-[#0684A0] text-white"
            >
              {isSubmitting || withdrawalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Transfer to Personal Account
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleWithdrawToMpesa} className="space-y-4">
            <div className="text-center mb-4">
              <div className="p-3 bg-[#0795B0]/20 rounded-full inline-block mb-2">
                <Smartphone className="h-6 w-6 text-[#0795B0]" />
              </div>
              <h3 className="text-lg font-semibold text-white">Withdraw to MPESA</h3>
              <p className="text-gray-400 text-sm">Convert crypto to Kenyan Shillings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={availableBalance}
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available: {availableBalance.toFixed(2)} {tokenType}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token
                </label>
                <select
                  value={tokenType}
                  onChange={(e) => setTokenType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chain
                </label>
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                >
                  <option value="arbitrum">Arbitrum</option>
                  <option value="base">Base</option>
                  <option value="celo">Celo</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || withdrawalLoading || !amount || !phoneNumber || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
              className="w-full bg-[#0795B0] hover:bg-[#0684A0] text-white"
            >
              {isSubmitting || withdrawalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Withdraw to MPESA
                </>
              )}
            </Button>
          </form>
        )}

        {activeTab === 'mpesa' && mpesaTransaction && (
          <div className="mt-6 rounded-lg border border-[#0795B0]/40 bg-[#0795B0]/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">M-Pesa Receipt</p>
                <p className="text-xs text-gray-400">Track status and reference IDs for support/reconciliation.</p>
              </div>
              <button
                type="button"
                onClick={refreshMpesaStatus}
                disabled={refreshingMpesa}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#0795B0] px-2.5 py-1 text-xs text-[#0795B0] hover:bg-[#0795B0]/10 disabled:opacity-60"
              >
                {refreshingMpesa ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <p className="text-gray-300">
                <span className="text-gray-400">Status:</span> {mpesaTransaction.status}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-400">Flow:</span> {mpesaTransaction.flowType}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-400">Amount:</span> KES {mpesaTransaction.quote.amountKes.toFixed(2)}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-400">Phone:</span> {mpesaTransaction.targets.phoneNumber || '-'}
              </p>
              <p className="text-gray-300 break-all">
                <span className="text-gray-400">Transaction ID:</span> {mpesaTransaction.transactionId}
              </p>
              <p className="text-gray-300 break-all">
                <span className="text-gray-400">M-Pesa Receipt:</span> {mpesaTransaction.daraja.receiptNumber || '-'}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {withdrawalError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-300 text-sm">{withdrawalError}</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Important Information:</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Personal transfers are instant and free</li>
            <li>• MPESA withdrawals may take 5-15 minutes</li>
            <li>• Conversion rates are updated in real-time</li>
            <li>• Minimum withdrawal amount is 1 USDC</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
