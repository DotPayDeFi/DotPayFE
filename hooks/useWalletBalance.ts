import { useState, useEffect } from 'react';
import useAxios from './useAxios';
import { useAuth } from '@/context/AuthContext';

export interface TokenBalance {
  [token: string]: number;
}

export interface ChainBalance {
  [chain: string]: TokenBalance;
}

export interface WalletBalanceData {
  walletAddress: string;
  totalUSDValue: number;
  balances: ChainBalance;
  chainsWithBalance: number;
  supportedChains: string[];
  lastUpdated: string;
}

export interface ChainSpecificBalance {
  walletAddress: string;
  chain: string;
  balances: TokenBalance;
  totalUSDValue: number;
  supportedTokens: string[];
  lastUpdated: string;
}

export const useWalletBalance = () => {
  const [balance, setBalance] = useState<WalletBalanceData | null>(null);
  const [chainBalance, setChainBalance] = useState<ChainSpecificBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useAxios();
  const { isAuthenticated } = useAuth();

  // Fetch all primary chain balances
  const fetchAllBalances = async () => {
    if (!isAuthenticated) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/token/balance');
      
      if (response.data.success) {
        setBalance(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch balances');
      }
    } catch (err: any) {
      console.error('Error fetching wallet balances:', err);
      setError(err.response?.data?.message || 'Failed to fetch wallet balances');
    } finally {
      setLoading(false);
    }
  };

  // Fetch balance for specific chain
  const fetchChainBalance = async (chain: string) => {
    if (!isAuthenticated) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/token/balance/${chain}`);
      
      if (response.data.success) {
        setChainBalance(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch chain balance');
      }
    } catch (err: any) {
      console.error(`Error fetching ${chain} balance:`, err);
      setError(err.response?.data?.message || `Failed to fetch ${chain} balance`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch balances when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllBalances();
    }
  }, [isAuthenticated]);

  return {
    balance,
    chainBalance,
    loading,
    error,
    fetchAllBalances,
    fetchChainBalance,
    refetch: fetchAllBalances
  };
};
