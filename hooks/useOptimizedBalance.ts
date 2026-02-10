import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useAxios from './useAxios';
import { useAuthSession } from '@/context/AuthSessionContext';

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

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

export const useOptimizedBalance = () => {
  const [balance, setBalance] = useState<WalletBalanceData | null>(null);
  const [chainBalance, setChainBalance] = useState<ChainSpecificBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useAxios();
  const { isLoggedIn } = useAuthSession();
  const queryClient = useQueryClient();
  const lastFetchTime = useRef<number>(0);
  const lastApiCallTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    return Date.now() - lastFetchTime.current < CACHE_DURATION;
  }, []);

  // Get cached balance from localStorage
  const getCachedBalance = useCallback((): WalletBalanceData | null => {
    try {
      const cached = localStorage.getItem('dotpay_balance_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheTime = parsed.timestamp;
        if (Date.now() - cacheTime < CACHE_DURATION) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.error('Error reading cached balance:', error);
    }
    return null;
  }, []);

  // Set cached balance to localStorage
  const setCachedBalance = useCallback((data: WalletBalanceData) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('dotpay_balance_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching balance:', error);
    }
  }, []);

  // Fetch all primary chain balances with caching
  const fetchAllBalances = useCallback(
    async (forceRefresh = false) => {
      if (!isLoggedIn) {
        setError("User not authenticated");
        return;
      }

      // Rate limiting: prevent API calls more than once every 10 seconds
      const now = Date.now();
      if (!forceRefresh && now - lastApiCallTime.current < 10000) {
        console.log("Rate limited: API call too frequent");
        return;
      }

      // Prevent concurrent API calls
      if (isFetching.current) {
        console.log("Already fetching, skipping duplicate call");
        return;
      }

      // Check cache first (unless force refresh)
      if (!forceRefresh && isCacheValid()) {
        const cachedBalance = getCachedBalance();
        if (cachedBalance) {
          setBalance(cachedBalance);
          setError(null);
          return;
        }
      }

      isFetching.current = true;
      lastApiCallTime.current = now;
      setLoading(true);
      setError(null);

      try {
        const response = await api.get("/token/balance");

        if (response.data.success) {
          const balanceData = response.data.data;
          setBalance(balanceData);
          setCachedBalance(balanceData);
          lastFetchTime.current = Date.now();
          setError(null);
        } else {
          setError(response.data.message || "Failed to fetch balances");
        }
      } catch (err: any) {
        console.error("Error fetching wallet balances:", err);

        // Try to use cached data on error
        const cachedBalance = getCachedBalance();
        if (cachedBalance) {
          setBalance(cachedBalance);
          setError("Using cached data - connection issue");
        } else {
          setError(err.response?.data?.message || "Failed to fetch wallet balances");
        }
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    },
    [isLoggedIn, api, isCacheValid, getCachedBalance, setCachedBalance]
  );

  // Fetch balance for specific chain
  const fetchChainBalance = useCallback(async (chain: string, forceRefresh = false) => {
    if (!isLoggedIn) {
      setError('User not authenticated');
      return;
    }

    // Check cache for chain-specific balance
    const cacheKey = `dotpay_chain_balance_${chain}`;
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            setChainBalance(parsed.data);
            setError(null);
            return;
          }
        }
      } catch (error) {
        console.error('Error reading cached chain balance:', error);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/token/balance/${chain}`);
      
      if (response.data.success) {
        const chainData = response.data.data;
        setChainBalance(chainData);
        
        // Cache chain-specific balance
        try {
          const cacheData = {
            data: chainData,
            timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
          console.error('Error caching chain balance:', error);
        }
        
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
  }, [isLoggedIn, api]);

  // Background refresh function
  const backgroundRefresh = useCallback(async () => {
    if (!isLoggedIn) return;
    
    // Rate limiting for background refresh
    const now = Date.now();
    if (now - lastApiCallTime.current < 30000) { // 30 seconds minimum between background calls
      return;
    }
    
    if (isFetching.current) {
      return;
    }
    
    try {
      isFetching.current = true;
      lastApiCallTime.current = now;
      
      const response = await api.get('/token/balance');
      if (response.data.success) {
        const balanceData = response.data.data;
        setBalance(balanceData);
        setCachedBalance(balanceData);
        lastFetchTime.current = Date.now();
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      isFetching.current = false;
    }
  }, [isLoggedIn, api, setCachedBalance]);

  // Initialize with cached data immediately
  useEffect(() => {
    if (isLoggedIn) {
      const cachedBalance = getCachedBalance();
      if (cachedBalance) {
        setBalance(cachedBalance);
        setError(null);
      }
      
      // Only fetch if we don't have cached data or cache is expired
      if (!cachedBalance || !isCacheValid()) {
        fetchAllBalances();
      }
    }
  }, [isLoggedIn]); // Remove function dependencies to prevent infinite loops

  // Set up background refresh interval with visibility detection
  useEffect(() => {
    if (!isLoggedIn) return;

    let interval: NodeJS.Timeout;
    let visibilityInterval: NodeJS.Timeout;

    // Regular background refresh (every 5 minutes)
    interval = setInterval(() => {
      if (!isCacheValid()) {
        backgroundRefresh();
      }
    }, 5 * 60 * 1000);

    // More frequent refresh when user is actively using the app (every 2 minutes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User is actively using the app, refresh more frequently
        visibilityInterval = setInterval(() => {
          if (!isCacheValid()) {
            backgroundRefresh();
          }
        }, 2 * 60 * 1000); // Every 2 minutes when active
      } else {
        // User is not actively using the app, clear the frequent refresh
        if (visibilityInterval) {
          clearInterval(visibilityInterval);
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus to refresh when user returns to app
    const handleWindowFocus = () => {
      if (!isCacheValid()) {
        backgroundRefresh();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    
    // Initial check
    handleVisibilityChange();

    return () => {
      if (interval) clearInterval(interval);
      if (visibilityInterval) clearInterval(visibilityInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isLoggedIn]); // Remove backgroundRefresh dependency

  // Clear cache function
  const clearCache = useCallback(() => {
    localStorage.removeItem('dotpay_balance_cache');
    // Clear all chain-specific caches
    const chains = ['arbitrum', 'base', 'celo', 'polygon', 'optimism', 'avalanche', 'bnb', 'scroll', 'gnosis'];
    chains.forEach(chain => {
      localStorage.removeItem(`dotpay_chain_balance_${chain}`);
    });
    lastFetchTime.current = 0;
  }, []);

  return {
    balance,
    chainBalance,
    loading,
    error,
    fetchAllBalances,
    fetchChainBalance,
    refetch: fetchAllBalances,
    clearCache,
    isCacheValid: isCacheValid()
  };
};
