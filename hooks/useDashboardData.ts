import { useState, useEffect, useCallback } from 'react';

// Types for API responses
export interface PlatformStats {
  overview: {
    totalUsers: number;
    totalBusinesses: number;
    totalWallets: number;
    totalTransactions: number;
    totalVolumeUSD: number;
    totalVolumeKES: number;
    activeUsers24h: number;
    activeUsers7d: number;
    activeUsers30d: number;
  };
  wallets: {
    totalWallets: number;
    walletsWithBalance: number;
    totalBalanceUSD: number;
    totalBalanceKES: number;
    walletsByChain: Record<string, number>;
  };
  transactions: {
    totalTransactions: number;
    totalVolumeUSD: number;
    totalVolumeKES: number;
    transactions24h: number;
    transactions7d: number;
    transactions30d: number;
    volume24hUSD: number;
    volume7dUSD: number;
    volume30dUSD: number;
    averageTransactionSizeUSD: number;
    topTransactionTypes: Array<{
      type: string;
      count: number;
      volumeUSD: number;
      percentage: number;
    }>;
  };
  growth: {
    newUsers24h: number;
    newUsers7d: number;
    newUsers30d: number;
    newBusinesses24h: number;
    newBusinesses7d: number;
    newBusinesses30d: number;
    userGrowthRate7d: number;
    userGrowthRate30d: number;
    transactionGrowthRate7d: number;
    transactionGrowthRate30d: number;
  };
  tokens: {
    totalTokensTracked: number;
    topTokensByVolume: Array<{
      symbol: string;
      volumeUSD: number;
      transactionCount: number;
      percentage: number;
    }>;
    tokenDistribution: Record<string, number>;
  };
  lastUpdated: string;
  dataSource: string;
}

export interface WalletStats {
  walletStats: {
    totalWallets: number;
    walletsWithBalance: number;
    totalBalanceUSD: number;
    totalBalanceKES: number;
    averageBalanceUSD: number;
    medianBalanceUSD: number;
  };
  chainBalances: Record<string, number>;
  balanceDistribution: {
    zeroBalance: number;
    under1USD: number;
    "1to10USD": number;
    "10to100USD": number;
    over100USD: number;
  };
  lastUpdated: string;
  dataSource: string;
}

export interface VolumeStats {
  volumeStats: {
    period: string;
    totalTransactions: number;
    totalVolumeUSD: number;
    totalVolumeKES: number;
    averageTransactionSizeUSD: number;
    medianTransactionSizeUSD: number;
    largestTransactionUSD: number;
    dailyBreakdown: Array<{
      date: string;
      transactions: number;
      volumeUSD: number;
      volumeKES: number;
    }>;
  };
  transactionTypes: Record<string, {
    count: number;
    volumeUSD: number;
    percentage: number;
  }>;
  lastUpdated: string;
  dataSource: string;
}

export interface DuneData {
  platform: string;
  timestamp: string;
  metrics: {
    total_users: number;
    total_businesses: number;
    total_wallets: number;
    total_transactions: number;
    total_volume_usd: number;
    transactions_24h: number;
    volume_24h_usd: number;
    new_users_24h: number;
    new_users_7d: number;
    active_wallets: number;
    avg_transaction_size_usd: number;
  };
  chains: Record<string, number>;
  tokens: Record<string, number>;
}

interface UseDashboardDataReturn {
  platformStats: PlatformStats | null;
  walletStats: WalletStats | null;
  volumeStats: VolumeStats | null;
  duneData: DuneData | null;
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8000/api/dashboard';

export const useDashboardData = (selectedPeriod: '24h' | '7d' | '30d' = '7d'): UseDashboardDataReturn => {
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [duneData, setDuneData] = useState<DuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, walletsRes, volumeRes, duneRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stats`),
        fetch(`${API_BASE_URL}/wallets`),
        fetch(`${API_BASE_URL}/volume?period=${selectedPeriod}`),
        fetch(`${API_BASE_URL}/dune`)
      ]);

      // Check if any request failed
      const failedRequests = [statsRes, walletsRes, volumeRes, duneRes].filter(res => !res.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to fetch dashboard data. ${failedRequests.length} endpoint(s) failed.`);
      }

      const [stats, wallets, volume, dune] = await Promise.all([
        statsRes.json(),
        walletsRes.json(),
        volumeRes.json(),
        duneRes.json()
      ]);

      // Validate that we have the expected data structure
      if (stats && typeof stats === 'object') {
        setPlatformStats(stats);
      }
      if (wallets && typeof wallets === 'object') {
        setWalletStats(wallets);
      }
      if (volume && typeof volume === 'object') {
        setVolumeStats(volume);
      }
      if (dune && typeof dune === 'object') {
        setDuneData(dune);
      }
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]); // Only depend on selectedPeriod to avoid infinite loop

  return {
    platformStats,
    walletStats,
    volumeStats,
    duneData,
    loading,
    error,
    lastRefresh,
    fetchData,
    refreshData
  };
};

export default useDashboardData;