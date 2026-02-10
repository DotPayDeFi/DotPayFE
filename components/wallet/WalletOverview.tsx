"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useStellar } from "@/hooks/useStellar";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

interface WalletOverviewProps {
  className?: string;
}

const WalletOverview: React.FC<WalletOverviewProps> = ({ className = "" }) => {
  const { wallet, balance, loading, refreshing, hasWallet, refreshWallet, initializeWallet, stellarWallet } = useWallet();
  const { balances: stellarBalances } = useStellar();
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [initializing, setInitializing] = useState(false);

  // Set first chain as default when balance data changes
  useEffect(() => {
    if (balance && selectedChain === "all" && Object.keys(balance.balances).length > 0) {
      setSelectedChain(Object.keys(balance.balances)[0]);
    }
  }, [balance]);

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, message = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  // Initialize wallet for new users
  const handleInitializeWallet = async () => {
    try {
      setInitializing(true);
      await initializeWallet();
    } catch (error) {
      // Error already handled in context
    } finally {
      setInitializing(false);
    }
  };

  // Format balance for display
  const formatBalance = (balance: number, decimals: number = 4): string => {
    if (balance === 0) return '0';
    if (balance < 0.0001) return '< 0.0001';
    return balance.toFixed(decimals);
  };

  // Format USD value
  const formatUSD = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get available chains
  const getAvailableChains = (): string[] => {
    if (!balance) return [];
    return Object.keys(balance.balances);
  };

  // Get tokens for selected chain
  const getTokensForChain = (chain: string) => {
    if (!balance || !balance.balances[chain]) return [];
    
    return Object.entries(balance.balances[chain]).map(([token, tokenBalance]) => ({
      token,
      balance: tokenBalance,
      // Calculate USD value (simplified - for USDC/USDT assume 1:1, others would need price API)
      usdValue: tokenBalance * (token === 'USDC' || token === 'USDT' ? 1 : 0)
    }));
  };

  // Calculate total USD for selected chain
  const getChainTotalUSD = (chain: string): number => {
    const tokens = getTokensForChain(chain);
    return tokens.reduce((total, token) => total + token.usdValue, 0);
  };

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'No wallet address';
  };

  if (loading || refreshing || initializing) {
    return (
      <div className={`p-6 text-center bg-white rounded-lg border ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-500">
          {initializing ? 'Setting up wallet...' : refreshing ? 'Refreshing wallet...' : 'Loading wallet...'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header with refresh button */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Wallet Overview</h2>
          <button
            onClick={refreshWallet}
            disabled={refreshing}
            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Wallet not set up */}
      {!hasWallet && (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Wallet Setup Required</h3>
          <p className="text-gray-500 mb-4">
            Your account is authenticated, but you need to set up your wallet first to view balances and make transactions.
          </p>
          <div className="space-x-2">
            <button
              onClick={handleInitializeWallet}
              disabled={initializing}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {initializing ? 'Setting up...' : 'Set Up Wallet'}
            </button>
            <button
              onClick={() => window.location.href = '/receive'}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              Go to Receive Page
            </button>
          </div>
        </div>
      )}

      {/* Wallet set up but no balance data */}
      {hasWallet && !balance && (
        <div className="p-6 text-center">
          <p className="text-gray-500 mb-4">Wallet is set up but no balance data available.</p>
          <button
            onClick={refreshWallet}
            disabled={refreshing}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {refreshing ? 'Loading...' : 'Load Balance'}
          </button>
        </div>
      )}

      {/* Wallet and balance data available */}
      {hasWallet && balance ? (
        <div className="p-6 space-y-6">
          {/* Total Balance Card */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Balance</h3>
            <p className="text-3xl font-bold">{formatUSD(balance.totalUSDValue)}</p>
            <div className="flex justify-between items-center mt-3 text-sm opacity-90">
              <span>Across {balance.chainsWithBalance} chains</span>
              <span>Last updated: {new Date(balance.lastUpdated).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Wallet Info Card */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {/* EVM Wallet Address */}
            <div>
              <h4 className="font-medium mb-2 text-gray-700">EVM Wallet Address</h4>
              <div className="flex items-center justify-between bg-white p-3 rounded border">
                <span className="font-mono text-sm text-gray-800">
                  {wallet ? formatWalletAddress(wallet.walletAddress) : 'N/A'}
                </span>
                <Copy 
                  size={16} 
                  className="cursor-pointer text-gray-500 hover:text-blue-500"
                  onClick={() => wallet && copyToClipboard(wallet.walletAddress, "EVM wallet address copied!")}
                />
              </div>
            </div>

            {/* Stellar Wallet Address */}
            {(user as any)?.stellarAccountId && (
              <div>
                <h4 className="font-medium mb-2 text-gray-700 flex items-center gap-2">
                  🌟 Stellar Wallet Address
                </h4>
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <span className="font-mono text-sm text-gray-800">
                    {formatWalletAddress((user as any).stellarAccountId)}
                  </span>
                  <Copy 
                    size={16} 
                    className="cursor-pointer text-gray-500 hover:text-blue-500"
                    onClick={() => copyToClipboard((user as any).stellarAccountId, "Stellar wallet address copied!")}
                  />
                </div>
              </div>
            )}

            {/* Phone Number */}
            {wallet?.phoneNumber && (
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Phone Number</h4>
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <span className="text-sm text-gray-800">{wallet?.phoneNumber}</span>
                  <Copy 
                    size={16} 
                    className="cursor-pointer text-gray-500 hover:text-blue-500"
                    onClick={() => wallet?.phoneNumber && copyToClipboard(wallet.phoneNumber, "Phone number copied!")}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            {wallet?.email && (
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Email Address</h4>
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <span className="text-sm text-gray-800">{wallet?.email}</span>
                  <Copy 
                    size={16} 
                    className="cursor-pointer text-gray-500 hover:text-blue-500"
                    onClick={() => wallet?.email && copyToClipboard(wallet.email, "Email copied!")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Chain Selection and Balances */}
          {(getAvailableChains().length > 0 || stellarBalances.length > 0) ? (
            <div>
              <h4 className="font-medium mb-3 text-gray-700">Token Balances by Chain</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedChain("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedChain === "all"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Chains
                </button>
                {getAvailableChains().map((chain) => (
                  <button
                    key={chain}
                    onClick={() => setSelectedChain(chain)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      selectedChain === chain
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {chain}
                  </button>
                ))}
                {/* Stellar Chain */}
                {stellarBalances.length > 0 && (
                  <button
                    onClick={() => setSelectedChain("stellar")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedChain === "stellar"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    🌟 Stellar
                  </button>
                )}
              </div>

              {/* Token Balances */}
              <div className="space-y-3">
                {selectedChain === "all" ? (
                  // Show all chains including Stellar
                  <>
                  {getAvailableChains().map((chain) => (
                    <div key={chain} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium capitalize text-gray-800">{chain}</h5>
                        <span className="text-sm text-gray-500">
                          {formatUSD(getChainTotalUSD(chain))}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {getTokensForChain(chain).map((tokenData) => (
                          <div key={tokenData.token} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600">
                                  {tokenData.token.slice(0, 2)}
                                </span>
                              </div>
                              <span className="font-medium">{tokenData.token}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatBalance(tokenData.balance)}</p>
                              <p className="text-sm text-gray-500">{formatUSD(tokenData.usdValue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Stellar Balances */}
                  {stellarBalances.length > 0 && (
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium text-gray-800 flex items-center gap-2">
                          🌟 Stellar
                        </h5>
                        <span className="text-sm text-gray-500">
                          {formatUSD(stellarBalances.reduce((total, bal) => total + bal.usdValue, 0))}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {stellarBalances.map((bal) => (
                          <div key={bal.asset} className="flex justify-between items-center p-3 bg-white rounded">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {bal.asset === 'XLM' ? '🌟' : '💵'}
                                </span>
                              </div>
                              <span className="font-medium">{bal.asset}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{parseFloat(bal.balance).toFixed(7)}</p>
                              <p className="text-sm text-gray-500">{formatUSD(bal.usdValue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </>
                ) : selectedChain === "stellar" ? (
                  // Show only Stellar
                  stellarBalances.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium text-gray-800 flex items-center gap-2">
                          🌟 Stellar
                        </h5>
                        <span className="text-sm text-gray-500">
                          {formatUSD(stellarBalances.reduce((total, bal) => total + bal.usdValue, 0))}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {stellarBalances.map((bal) => (
                          <div key={bal.asset} className="flex justify-between items-center p-3 bg-white rounded">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {bal.asset === 'XLM' ? '🌟' : '💵'}
                                </span>
                              </div>
                              <span className="font-medium">{bal.asset}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{parseFloat(bal.balance).toFixed(7)}</p>
                              <p className="text-sm text-gray-500">{formatUSD(bal.usdValue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No Stellar tokens found</p>
                    </div>
                  )
                ) : (
                  // Show selected chain only
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium capitalize text-gray-800">{selectedChain}</h5>
                      <span className="text-sm text-gray-500">
                        {formatUSD(getChainTotalUSD(selectedChain))}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {getTokensForChain(selectedChain).map((tokenData) => (
                        <div key={tokenData.token} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">
                                {tokenData.token.slice(0, 2)}
                              </span>
                            </div>
                            <span className="font-medium">{tokenData.token}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatBalance(tokenData.balance)}</p>
                            <p className="text-sm text-gray-500">{formatUSD(tokenData.usdValue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // No tokens found
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No tokens found</p>
              <p className="text-sm text-gray-400">Your wallet is set up but doesn&apos;t have any token balances yet.</p>
            </div>
          )}

          {/* Supported Chains Info */}
          {wallet?.supportedChains && wallet.supportedChains.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-gray-700">Supported Networks</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {wallet?.supportedChains?.map((chain) => (
                  <div key={chain.id} className="flex items-center space-x-2 p-2 bg-white rounded">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-700">{chain.name}</span>
                  </div>
                ))}
              </div>
              {wallet?.note && (
                <div className="mt-3 p-3 bg-blue-100 rounded text-sm text-blue-800">
                  {wallet?.note}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default WalletOverview;