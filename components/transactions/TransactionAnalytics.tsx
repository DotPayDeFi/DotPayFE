"use client";

import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../../lib/transactions';
import { TransactionHistoryFilters } from '../../types/transaction-types';

interface AnalyticsData {
  totalVolume: number;
  totalCryptoVolume: number;
  averageTransactionSize: number;
  transactionCount: number;
  statusDistribution: Record<string, number>;
  chainDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  tokenDistribution: Record<string, number>;
  dailyVolume: Array<{ date: string; volume: number; count: number }>;
  conversionMetrics?: {
    totalBuyVolume: number;
    totalSellVolume: number;
    averageConversionRate: number;
  };
}

interface TransactionAnalyticsProps {
  filters?: TransactionHistoryFilters;
  className?: string;
}

export const TransactionAnalytics: React.FC<TransactionAnalyticsProps> = ({ 
  filters = {}, 
  className = "" 
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Set date range based on selection
      const now = new Date();
      const dateFilters: Partial<TransactionHistoryFilters> = {};
      
      switch (timeRange) {
        case '7d':
          dateFilters.dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          dateFilters.dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          dateFilters.dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          dateFilters.dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }
      
      dateFilters.dateTo = now.toISOString();

      const response = await transactionAPI.getTransactionAnalytics({
        ...filters,
        ...dateFilters,
      });

      if (response.success) {
        setAnalytics(response.data);
      } else {
        setError('Failed to load analytics');
      }
    } catch (error: any) {
      console.error('Analytics error:', error);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, filters]);

  const formatCurrency = (amount: number, currency: 'USD' | 'KES' = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className={`bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0795B0] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`bg-[#0A0E0E] border border-red-500 rounded-xl p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-400 text-4xl mb-4">📊</div>
          <h3 className="text-white font-semibold mb-2">Analytics Unavailable</h3>
          <p className="text-gray-400 mb-4">{error || 'No analytics data available'}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Transaction Analytics</h2>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-3 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] transition-colors duration-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(analytics.totalVolume)}
            </div>
            <div className="text-gray-400 text-sm">Total Volume</div>
          </div>
        </div>

        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(analytics.transactionCount)}
            </div>
            <div className="text-gray-400 text-sm">Transactions</div>
          </div>
        </div>

        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(analytics.averageTransactionSize)}
            </div>
            <div className="text-gray-400 text-sm">Avg. Size</div>
          </div>
        </div>

        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">🪙</div>
            <div className="text-2xl font-bold text-white mb-1">
              {analytics.totalCryptoVolume.toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Crypto Volume</div>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution */}
        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.statusDistribution).map(([status, count]) => {
              const percentage = getPercentage(count, analytics.transactionCount);
              const statusColors: Record<string, string> = {
                completed: 'bg-green-500',
                pending: 'bg-yellow-500',
                processing: 'bg-blue-500',
                failed: 'bg-red-500',
                error: 'bg-red-600',
                reserved: 'bg-orange-500',
              };
              const bgColor = statusColors[status] || 'bg-gray-500';
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
                    <span className="text-white capitalize">{status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">{count}</span>
                    <span className="text-gray-400 text-sm">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chain Distribution */}
        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.chainDistribution).map(([chain, count]) => {
              const percentage = getPercentage(count, analytics.transactionCount);
              const chainColors: Record<string, string> = {
                arbitrum: 'bg-blue-500',
                celo: 'bg-green-500',
                polygon: 'bg-purple-500',
                base: 'bg-blue-400',
                optimism: 'bg-red-500',
                ethereum: 'bg-gray-500',
              };
              const bgColor = chainColors[chain] || 'bg-gray-500';
              
              return (
                <div key={chain} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
                    <span className="text-white capitalize">{chain}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">{count}</span>
                    <span className="text-gray-400 text-sm">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transaction Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Distribution */}
        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction Types</h3>
          <div className="space-y-3">
            {Object.entries(analytics.typeDistribution).map(([type, count]) => {
              const percentage = getPercentage(count, analytics.transactionCount);
              const typeIcons: Record<string, string> = {
                token_transfer: '↗️',
                fiat_to_crypto: '💰',
                crypto_to_fiat: '💸',
                crypto_to_paybill: '📱',
                crypto_to_till: '🏪',
              };
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{typeIcons[type] || '💳'}</span>
                    <span className="text-white capitalize">{type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">{count}</span>
                    <span className="text-gray-400 text-sm">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token Distribution */}
        <div className="bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Token Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.tokenDistribution).map(([token, count]) => {
              const percentage = getPercentage(count, analytics.transactionCount);
              
              return (
                <div key={token} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-[#0795B0]"></div>
                    <span className="text-white font-medium">{token}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">{count}</span>
                    <span className="text-gray-400 text-sm">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversion Metrics (if available) */}
      {analytics.conversionMetrics && (
        <div className="mt-6 bg-[#1A1E1E] border border-[#0795B0] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Conversion Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400 mb-1">
                {formatCurrency(analytics.conversionMetrics.totalBuyVolume)}
              </div>
              <div className="text-gray-400 text-sm">Total Buy Volume</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400 mb-1">
                {formatCurrency(analytics.conversionMetrics.totalSellVolume)}
              </div>
              <div className="text-gray-400 text-sm">Total Sell Volume</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400 mb-1">
                {analytics.conversionMetrics.averageConversionRate.toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">Avg. Conversion Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};