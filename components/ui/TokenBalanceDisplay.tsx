import React, { useState, useEffect } from 'react';
import { cryptoAPI } from '../../lib/crypto';

interface TokenBalanceDisplayProps {
  chain: string;
  className?: string;
}

interface TokenBalance {
  token: string;
  balance: number;
  chain: string;
}

export const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({ 
  chain, 
  className = "" 
}) => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await cryptoAPI.getBalance();
      
      if (response.success && response.data?.balances) {
        const tokenBalances: TokenBalance[] = [];
        
        for (const [token, balance] of Object.entries(response.data.balances)) {
          const tokenBalance = typeof balance === 'number' ? balance : 0;
          if (tokenBalance > 0) {
            tokenBalances.push({
              token,
              balance: tokenBalance,
              chain
            });
          }
        }
        
        setBalances(tokenBalances);
      } else {
        setError('Failed to fetch balances');
      }
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      setError('Error loading balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [chain]);

  if (loading) {
    return (
      <div className={`bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
          <span className="text-blue-300 text-sm">Loading balances...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-red-300 text-sm">{error}</span>
          <button
            onClick={fetchBalances}
            className="text-red-400 hover:text-red-300 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className={`bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 ${className}`}>
        <span className="text-yellow-300 text-sm">
          No token balances found on {chain} network
        </span>
      </div>
    );
  }

  return null; // Hide the balance display component
};
