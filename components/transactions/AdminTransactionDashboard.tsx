"use client";

import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../../lib/transactions';
import { TransactionHistoryFilters, AdminTransactionResponse } from '../../types/transaction-types';
import { TransactionAnalytics } from './TransactionAnalytics';
import { TransactionExport } from './TransactionExport';

interface AdminTransactionDashboardProps {
  className?: string;
}

export const AdminTransactionDashboard: React.FC<AdminTransactionDashboardProps> = ({ 
  className = "" 
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'all' | 'onchain' | 'fiat-crypto' | 'analytics' | 'export'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminTransactionResponse | null>(null);
  const [filters, setFilters] = useState<TransactionHistoryFilters>({
    page: 1,
    limit: 50,
  });

  const loadData = async (endpoint: 'all' | 'onchain' | 'fiat-crypto') => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (endpoint) {
        case 'all':
          response = await transactionAPI.getAllTransactions(filters);
          break;
        case 'onchain':
          response = await transactionAPI.getOnchainTransactions(filters);
          break;
        case 'fiat-crypto':
          response = await transactionAPI.getFiatCryptoTransactions(filters);
          break;
      }

      if (response.success) {
        setData(response);
      } else {
        setError('Failed to load transaction data');
      }
    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      setError('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'all' || activeView === 'onchain' || activeView === 'fiat-crypto') {
      loadData(activeView);
    }
  }, [activeView, filters]);

  const updateFilters = (newFilters: Partial<TransactionHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const views = [
    { id: 'overview', label: 'Overview', icon: '📊', description: 'Platform summary and key metrics' },
    { id: 'all', label: 'All Transactions', icon: '📋', description: 'Complete transaction history' },
    { id: 'onchain', label: 'Onchain Only', icon: '⛓️', description: 'Blockchain transactions only' },
    { id: 'fiat-crypto', label: 'Fiat-Crypto', icon: '💱', description: 'Buy/sell conversions' },
    { id: 'analytics', label: 'Analytics', icon: '📈', description: 'Advanced analytics and insights' },
    { id: 'export', label: 'Export', icon: '📤', description: 'Data export and reporting' },
  ];

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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Transaction Dashboard</h1>
            <p className="text-gray-400">
              Comprehensive transaction management and analytics for administrators
            </p>
          </div>
          <div className="text-4xl">🔧</div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`p-4 rounded-lg border transition-colors duration-200 ${
                activeView === view.id
                  ? 'bg-[#0795B0] border-[#0795B0] text-white'
                  : 'bg-[#1A1E1E] border-[#0795B0]/30 text-gray-400 hover:text-white hover:border-[#0795B0]'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{view.icon}</div>
                <div className="font-medium text-sm">{view.label}</div>
                <div className="text-xs mt-1 opacity-75">{view.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0A0E0E] border border-green-500 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {data?.data?.analytics?.statusDistribution?.completed || 0}
              </div>
              <div className="text-gray-400 text-sm">Completed</div>
            </div>

            <div className="bg-[#0A0E0E] border border-yellow-500 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {data?.data?.analytics?.statusDistribution?.pending || 0}
              </div>
              <div className="text-gray-400 text-sm">Pending</div>
            </div>

            <div className="bg-[#0A0E0E] border border-red-500 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-2xl font-bold text-red-400 mb-1">
                {data?.data?.analytics?.statusDistribution?.failed || 0}
              </div>
              <div className="text-gray-400 text-sm">Failed</div>
            </div>

            <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-[#0795B0] mb-1">
                {data?.data?.analytics?.totalVolume ? formatCurrency(data.data.analytics.totalVolume) : '$0'}
              </div>
              <div className="text-gray-400 text-sm">Total Volume</div>
            </div>
          </div>

          {/* Platform Overview */}
          <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Platform Overview</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chain Distribution */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution</h3>
                <div className="space-y-3">
                  {data?.data?.analytics?.chainDistribution && Object.entries(data.data.analytics.chainDistribution).map(([chain, count]) => {
                    const total = Object.values(data.data.analytics!.chainDistribution).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div key={chain} className="flex items-center justify-between p-3 bg-[#1A1E1E] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-[#0795B0]"></div>
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

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {data?.data?.transactions?.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-[#1A1E1E] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">
                          {transaction.type === 'fiat_to_crypto' ? '💰' : 
                           transaction.type === 'crypto_to_fiat' ? '💸' : 
                           transaction.type === 'token_transfer' ? '↗️' : '💳'}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {transaction.token.amount} {transaction.token.symbol}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {transaction.blockchain.chain} • {transaction.timing.ageMinutes}m ago
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {transaction.status}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">📋</div>
                      <p className="text-gray-400">No recent transactions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveView('all')}
              className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 text-center hover:border-[#0AA5C0] transition-colors duration-200"
            >
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-white font-semibold mb-2">View All Transactions</h3>
              <p className="text-gray-400 text-sm">Browse complete transaction history</p>
            </button>

            <button
              onClick={() => setActiveView('analytics')}
              className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 text-center hover:border-[#0AA5C0] transition-colors duration-200"
            >
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-white font-semibold mb-2">View Analytics</h3>
              <p className="text-gray-400 text-sm">Analyze transaction patterns</p>
            </button>

            <button
              onClick={() => setActiveView('export')}
              className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 text-center hover:border-[#0AA5C0] transition-colors duration-200"
            >
              <div className="text-3xl mb-3">📤</div>
              <h3 className="text-white font-semibold mb-2">Export Data</h3>
              <p className="text-gray-400 text-sm">Download transaction reports</p>
            </button>
          </div>
        </div>
      )}

      {/* Transaction Lists */}
      {(activeView === 'all' || activeView === 'onchain' || activeView === 'fiat-crypto') && (
        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeView === 'all' && 'All Platform Transactions'}
                {activeView === 'onchain' && 'Onchain Transactions'}
                {activeView === 'fiat-crypto' && 'Fiat-Crypto Conversions'}
              </h2>
              {data?.data?.summary && (
                <p className="text-gray-400 text-sm">
                  {formatNumber(data.data.summary.total)} transactions • Page {data.data.summary.page} of {data.data.summary.pages}
                </p>
              )}
            </div>
            <button
              onClick={() => loadData(activeView as any)}
              disabled={loading}
              className="px-4 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Enhanced Filters for Admin */}
          <div className="mb-6 p-4 bg-[#1A1E1E] rounded-lg border border-[#0795B0]/30">
            <h3 className="text-white font-semibold mb-4">Admin Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-2">User ID</label>
                <input
                  type="text"
                  placeholder="Filter by user..."
                  value={filters.userId || ''}
                  onChange={(e) => updateFilters({ userId: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2">Min Amount</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount || ''}
                  onChange={(e) => updateFilters({ minAmount: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2">Max Amount</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filters.maxAmount || ''}
                  onChange={(e) => updateFilters({ maxAmount: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2">Has TX Hash</label>
                <select
                  value={filters.hasTransactionHash?.toString() || ''}
                  onChange={(e) => updateFilters({ hasTransactionHash: e.target.value ? e.target.value === 'true' : undefined })}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2">Has M-Pesa ID</label>
                <select
                  value={filters.hasMpesaId?.toString() || ''}
                  onChange={(e) => updateFilters({ hasMpesaId: e.target.value ? e.target.value === 'true' : undefined })}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-xs mb-2">Page Size</label>
                <select
                  value={filters.limit || 50}
                  onChange={(e) => updateFilters({ limit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0795B0] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 text-4xl mb-4">❌</div>
              <h3 className="text-white font-semibold mb-2">Error Loading Data</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => loadData(activeView as any)}
                className="px-4 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          ) : data?.data?.transactions?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-white font-semibold mb-2">No Transactions Found</h3>
              <p className="text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.data?.transactions?.map((transaction) => (
                <div key={transaction.id} className="bg-[#1A1E1E] border border-[#0795B0]/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="text-lg">
                          {transaction.type === 'fiat_to_crypto' ? '💰' : 
                           transaction.type === 'crypto_to_fiat' ? '💸' : 
                           transaction.type === 'token_transfer' ? '↗️' : '💳'}
                        </div>
                        <div>
                          <div className="text-white font-medium">{transaction.token.amount} {transaction.token.symbol}</div>
                          <div className="text-gray-400 text-sm">{transaction.values.usd.formatted}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-xs mb-1">User & Chain</div>
                      <div className="text-white text-sm">{transaction.user?.phone || 'N/A'}</div>
                      <div className="text-gray-400 text-sm">{transaction.blockchain.network}</div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-xs mb-1">Status & Time</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs ${
                        transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {transaction.status}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">{transaction.timing.ageMinutes}m ago</div>
                    </div>

                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => window.open(transaction.blockchain.explorerUrl, '_blank')}
                        className="px-3 py-1 bg-[#0795B0] text-white text-xs rounded hover:bg-[#0684A0] transition-colors duration-200"
                      >
                        Explorer
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(transaction.id)}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors duration-200"
                      >
                        Copy ID
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data?.data?.summary && data.data.summary.pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#0795B0]">
              <div className="text-gray-400 text-sm">
                Page {data.data.summary.page} of {data.data.summary.pages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateFilters({ page: Math.max(1, (filters.page || 1) - 1) })}
                  disabled={!data.data.summary.hasPrev}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Previous
                </button>
                <button
                  onClick={() => updateFilters({ page: (filters.page || 1) + 1 })}
                  disabled={!data.data.summary.hasNext}
                  className="px-3 py-1 bg-[#0795B0] text-white text-sm rounded hover:bg-[#0684A0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <TransactionAnalytics filters={filters} />
      )}

      {/* Export View */}
      {activeView === 'export' && (
        <TransactionExport filters={filters} />
      )}
    </div>
  );
};