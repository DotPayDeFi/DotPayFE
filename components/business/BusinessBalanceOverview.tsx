"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useBusinessFinance } from '@/hooks/useBusinessFinance';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Wallet, 
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BusinessBalanceOverviewProps {
  className?: string;
}

export const BusinessBalanceOverview: React.FC<BusinessBalanceOverviewProps> = ({ className = "" }) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const {
    businessBalance,
    balanceLoading,
    balanceError,
    getBusinessBalance,
    chainBalance,
    chainBalanceLoading,
    chainBalanceError,
    getBusinessBalanceByChain
  } = useBusinessFinance();

  const [showBalance, setShowBalance] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleRefresh = () => {
    if (currentBusiness?.businessId) {
      console.log('🔄 Manual refresh triggered for business:', currentBusiness.businessId);
      getBusinessBalance(currentBusiness.businessId);
    }
  };

  const toggleChainExpansion = (chain: string) => {
    const newExpanded = new Set(expandedChains);
    if (newExpanded.has(chain)) {
      newExpanded.delete(chain);
    } else {
      newExpanded.add(chain);
    }
    setExpandedChains(newExpanded);
  };

  const getChainIcon = (chain: string) => {
    switch (chain.toLowerCase()) {
      case 'arbitrum': return '🔷';
      case 'base': return '🔵';
      case 'celo': return '🟡';
      default: return '⛓️';
    }
  };

  const getChainColor = (chain: string) => {
    switch (chain.toLowerCase()) {
      case 'arbitrum': return 'text-blue-400';
      case 'base': return 'text-blue-300';
      case 'celo': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getChainBgColor = (chain: string) => {
    switch (chain.toLowerCase()) {
      case 'arbitrum': return 'bg-blue-500/10 border-blue-500/20';
      case 'base': return 'bg-blue-400/10 border-blue-400/20';
      case 'celo': return 'bg-yellow-500/10 border-yellow-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getFilteredBalances = () => {
    if (!businessBalance) return null;
    
    if (selectedChain === 'all') {
      return businessBalance.balances;
    }
    
    return {
      [selectedChain]: businessBalance.balances[selectedChain as keyof typeof businessBalance.balances]
    };
  };

  const getTotalForChain = (chain: string) => {
    if (!businessBalance) return 0;
    const chainBalance = businessBalance.balances[chain as keyof typeof businessBalance.balances];
    if (!chainBalance) return 0;
    
    let total = 0;
    Object.values(chainBalance).forEach((tokenBalance: any) => {
      if (tokenBalance && typeof tokenBalance === 'object' && tokenBalance.usdValue) {
        total += tokenBalance.usdValue;
      }
    });
    return total;
  };

  const getTotalForToken = (token: string) => {
    if (!businessBalance) return 0;
    let total = 0;
    Object.values(businessBalance.balances).forEach(chainBalance => {
      const tokenBalance = chainBalance[token as keyof typeof chainBalance] as any;
      if (tokenBalance && typeof tokenBalance === 'object' && tokenBalance.usdValue) {
        total += tokenBalance.usdValue;
      }
    });
    return total;
  };

  const filteredBalances = getFilteredBalances();

  if (!currentBusiness) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-gray-400">No business account selected</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Business Balance</h2>
          <p className="text-gray-400">Multi-chain crypto balance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={balanceLoading}
            variant="outline"
            size="sm"
            className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
          >
            {balanceLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0795B0]"></div>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => setShowBalance(!showBalance)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-r from-[#0795B0] to-[#0684A0] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Total Balance</p>
            <h3 className="text-3xl font-bold text-white">
              {showBalance 
                ? `$${(businessBalance?.overview?.totalUSDValue || 0).toLocaleString()}`
                : '••••••'
              }
            </h3>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <Wallet className="h-8 w-8 text-white" />
          </div>
        </div>
        
        {balanceError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-300 text-sm">{balanceError}</p>
            </div>
          </div>
        )}

        {businessBalance && (
          <div className="mt-4 text-xs text-white/60">
            Last updated: {new Date(businessBalance.overview.lastUpdated).toLocaleString()}
          </div>
        )}

      </div>

      {/* Chain Selection */}
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Filter by Chain</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedChain('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedChain === 'all'
                ? 'bg-[#0795B0] text-white'
                : 'bg-[#1A1E1E] text-gray-400 hover:text-white hover:bg-[#1A1E1E]/80'
            }`}
          >
            <Wallet className="h-4 w-4" />
            All Chains
          </button>
          {['arbitrum', 'base', 'celo', 'polygon', 'optimism'].map((chain) => {
            const chainTotal = getTotalForChain(chain);
            const hasBalance = chainTotal > 0;
            
            return (
              <button
                key={chain}
                onClick={() => setSelectedChain(chain)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedChain === chain
                    ? 'bg-[#0795B0] text-white'
                    : hasBalance
                    ? 'bg-[#1A1E1E] text-white hover:bg-[#1A1E1E]/80'
                    : 'bg-[#1A1E1E] text-gray-400 hover:text-white hover:bg-[#1A1E1E]/80'
                }`}
              >
                <span className="text-sm">{getChainIcon(chain)}</span>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
                {hasBalance && (
                  <span className="text-xs bg-[#0795B0]/20 px-1.5 py-0.5 rounded">
                    ${chainTotal.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Balance Display */}
      {filteredBalances && (
        <div className="space-y-3">
          {Object.entries(filteredBalances).map(([chain, tokens]) => {
            const chainTotal = getTotalForChain(chain);
            const hasBalance = chainTotal > 0;
            const isExpanded = expandedChains.has(chain);
            
            return (
              <div key={chain} className={`rounded-lg border transition-all duration-200 ${getChainBgColor(chain)}`}>
                {/* Chain Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                  onClick={() => toggleChainExpansion(chain)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getChainIcon(chain)}</span>
                      <div>
                        <h4 className={`text-lg font-semibold ${getChainColor(chain)}`}>
                          {chain.charAt(0).toUpperCase() + chain.slice(1)}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {hasBalance ? `${Object.keys(tokens).filter(token => {
                            const balance = tokens[token as keyof typeof tokens] as any;
                            return balance && balance.balance > 0;
                          }).length} tokens with balance` : 'No balance'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className={`text-lg font-bold ${getChainColor(chain)}`}>
                          {showBalance ? `$${chainTotal.toFixed(2)}` : '••••'}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Token Details (Collapsible) */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10">
                    <div className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(tokens).map(([token, tokenBalance]) => {
                          const balance = tokenBalance as any;
                          if (!balance || typeof balance !== 'object') return null;
                          
                          return (
                            <div key={token} className={`rounded-lg p-3 transition-colors ${
                              balance.balance > 0 
                                ? 'bg-[#0795B0]/20 border border-[#0795B0]/30' 
                                : 'bg-[#0A0E0E]/50 border border-gray-700/30'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-xs font-medium ${
                                    balance.balance > 0 ? 'text-[#0795B0]' : 'text-gray-400'
                                  }`}>
                                    {token}
                                  </p>
                                  <p className="text-white font-medium">
                                    {showBalance ? balance.balance?.toFixed(2) || '0.00' : '••••'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-400">USD</p>
                                  <p className={`text-sm font-medium ${
                                    balance.balance > 0 ? 'text-white' : 'text-gray-500'
                                  }`}>
                                    {showBalance ? `$${balance.usdValue?.toFixed(2) || '0.00'}` : '••••'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Token Summary */}
      {selectedChain === 'all' && businessBalance && (
        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Token Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {businessBalance.summary.supportedTokens.map((token) => {
              const totalValue = getTotalForToken(token);
              const hasBalance = totalValue > 0;
              
              return (
                <div key={token} className={`rounded-lg p-3 transition-colors ${
                  hasBalance 
                    ? 'bg-[#0795B0]/20 border border-[#0795B0]/30' 
                    : 'bg-[#1A1E1E] border border-gray-700/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium ${
                        hasBalance ? 'text-[#0795B0]' : 'text-gray-400'
                      }`}>
                        {token} Total
                      </p>
                      <p className="text-white font-medium">
                        {showBalance ? totalValue.toFixed(2) : '••••'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">USD</p>
                      <p className={`text-sm font-medium ${
                        hasBalance ? 'text-white' : 'text-gray-500'
                      }`}>
                        {showBalance ? `$${totalValue.toFixed(2)}` : '••••'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wallet Address */}
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Business Wallet</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => copyToClipboard(currentBusiness.walletAddress, 'Wallet Address')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white"
          >
            <span className="font-mono text-sm">
              {currentBusiness.walletAddress.slice(0, 6)}...{currentBusiness.walletAddress.slice(-4)}
            </span>
            <Copy className="h-3 w-3 ml-2" />
          </Button>
          <Button
            onClick={() => window.open(`https://etherscan.io/address/${currentBusiness.walletAddress}`, '_blank')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
