"use client";

import React, { useState } from 'react';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import { transactionUtils } from '../../lib/transactions';
import { Transaction, TransactionHistoryFilters } from '../../types/transaction-types';

export const TransactionHistory: React.FC = () => {
  const {
    transactions,
    summary,
    filtersInfo,
    loading,
    loadingMore,
    error,
    loadMore,
    refreshTransactions,
    updateFilters,
    clearFilters,
    currentFilters,
    hasMore,
  } = useTransactionHistory();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'error', label: 'Error' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'token_transfer', label: 'Token Transfer' },
    { value: 'fiat_to_crypto', label: 'Buy Crypto' },
    { value: 'crypto_to_fiat', label: 'Sell Crypto' },
    { value: 'crypto_to_paybill', label: 'Pay Bill' },
    { value: 'crypto_to_till', label: 'Till Payment' },
  ];

  const chainOptions = [
    { value: '', label: 'All Chains' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'celo', label: 'Celo' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'base', label: 'Base' },
    { value: 'optimism', label: 'Optimism' },
  ];

  const tokenOptions = [
    { value: '', label: 'All Tokens' },
    { value: 'USDC', label: 'USDC' },
    { value: 'USDT', label: 'USDT' },
    { value: 'BTC', label: 'BTC' },
    { value: 'ETH', label: 'ETH' },
    { value: 'WETH', label: 'WETH' },
    { value: 'WBTC', label: 'WBTC' },
    { value: 'DAI', label: 'DAI' },
    { value: 'CELO', label: 'CELO' },
  ];

  const handleFilterChange = (key: keyof TransactionHistoryFilters, value: string) => {
    updateFilters({ [key]: value || undefined });
  };

  const handleDateRangeChange = (type: 'from' | 'to', value: string) => {
    const newDateRange = { ...dateRange, [type]: value };
    setDateRange(newDateRange);
    
    if (type === 'from' && value) {
      updateFilters({ dateFrom: new Date(value).toISOString() });
    } else if (type === 'to' && value) {
      updateFilters({ dateTo: new Date(value).toISOString() });
    } else if (!value) {
      updateFilters({ [type === 'from' ? 'dateFrom' : 'dateTo']: undefined });
    }
  };

  const clearDateFilters = () => {
    setDateRange({ from: '', to: '' });
    updateFilters({ dateFrom: undefined, dateTo: undefined });
  };

  const TransactionCard: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const {
      id,
      type,
      status,
      token,
      values,
      blockchain,
      timing,
      dashboard,
      user,
      mpesa,
      conversion,
      transactionCategory,
      transactionSubType,
    } = transaction;

    // Get category label
    const getCategoryLabel = (category?: string) => {
      switch (category) {
        case 'onchain':
          return 'On-chain TX';
        case 'onramp':
          return 'Onramp';
        case 'offramp':
          return 'Offramp';
        case 'cardpayment':
          return 'Card Payment';
        default:
          return category || '';
      }
    };

    const getStatusDisplay = (status: string) => {
      const statusMap: Record<string, { text: string; color: string; bg: string }> = {
        completed: { text: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20' },
        pending: { text: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
        processing: { text: 'Processing', color: 'text-blue-400', bg: 'bg-blue-500/20' },
        failed: { text: 'Failed', color: 'text-red-400', bg: 'bg-red-500/20' },
        error: { text: 'Error', color: 'text-red-500', bg: 'bg-red-600/20' },
        reserved: { text: 'Reserved', color: 'text-orange-400', bg: 'bg-orange-500/20' },
      };
      return statusMap[status] || statusMap.completed;
    };

    const statusDisplay = getStatusDisplay(status);

    return (
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-4 hover:border-[#0AA5C0] transition-colors duration-200 cursor-pointer"
           onClick={() => {
             setSelectedTransaction(transaction);
             setShowDetails(true);
           }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="text-2xl shrink-0">{transactionUtils.getTypeIcon(type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-white font-semibold text-sm">
                  {dashboard?.summary || `${type.replace('_', ' ')} Transaction`}
                </h3>
                {(transactionCategory || transactionSubType) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {transactionCategory && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        {getCategoryLabel(transactionCategory)}
                      </span>
                    )}
                    {transactionSubType && (
                      <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400 capitalize">
                        {transactionSubType}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-xs">
                {transactionUtils.formatTimeAgo(timing.ageMinutes)} • ID: {id}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color} border border-current shrink-0`}>
            {statusDisplay.text}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-gray-400 text-xs mb-1">Amount</p>
            <p className="text-white font-semibold">
              {token.amount} {token.symbol}
            </p>
            <p className="text-gray-400 text-xs">
              {values.usd.formatted} • {values.kes.formatted}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Network</p>
            <p className={`font-semibold ${transactionUtils.getChainColor(blockchain.chain)}`}>
              {blockchain.network}
            </p>
            <p className="text-gray-400 text-xs">
              {blockchain.explorerName}
            </p>
          </div>
        </div>

        {/* Conversion Details (if applicable) */}
        {conversion && (
          <div className="mb-3 p-2 bg-[#1A1E1E] rounded-lg border border-[#0795B0]/30">
            <p className="text-gray-400 text-xs mb-1">Conversion</p>
            <p className="text-white text-sm">{conversion.direction}</p>
            <p className="text-gray-400 text-xs">{conversion.rateDisplay}</p>
          </div>
        )}

        {/* M-Pesa Details (if applicable) */}
        {mpesa && (
          <div className="mb-3 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-gray-400 text-xs mb-1">M-Pesa Transaction</p>
            <p className="text-green-300 text-sm">ID: {mpesa.transactionId}</p>
            {mpesa.receiptNumber && (
              <p className="text-gray-400 text-xs">Receipt: {mpesa.receiptNumber}</p>
            )}
          </div>
        )}

        {/* Processing Time & Hash */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-xs mb-1">Transaction Hash</p>
            <p className="text-white font-mono text-xs truncate">
              {blockchain.txHash}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <div className="text-xs text-gray-400">
              {timing.processingTimeSeconds}s
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(blockchain.explorerUrl, '_blank');
              }}
              className="px-3 py-1 bg-[#0795B0] text-white text-xs rounded hover:bg-[#0684A0] transition-colors duration-200"
            >
              Explorer
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0795B0] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-[#0A0E0E] rounded-xl border border-red-500 p-6">
          <div className="text-center py-12">
            <div className="text-red-400 text-4xl mb-4">❌</div>
            <h3 className="text-white font-semibold mb-2">Failed to Load Transactions</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={refreshTransactions}
              className="px-4 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Transaction History</h2>
            {summary && (
              <p className="text-gray-400 text-sm">
                {summary.total} transactions • Showing {transactions.length} loaded • Page {summary.page} of {summary.pages}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-[#1A1E1E] border border-[#0795B0] text-white rounded hover:bg-[#0A0E0E] transition-colors duration-200"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button
              onClick={refreshTransactions}
              className="px-4 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] transition-colors duration-200"
            >
              Refresh
            </button>
          </div>
        </div>


        {/* Enhanced Filters */}
        {showFilters && (
          <div className="bg-[#1A1E1E] rounded-lg p-6 mb-6 border border-[#0795B0]">
            <h3 className="text-white font-semibold mb-4">Filter Transactions</h3>
            
            {/* Primary Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-gray-400 text-xs mb-2">Status</label>
                <select
                  value={currentFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">Type</label>
                <select
                  value={currentFilters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">Chain</label>
                <select
                  value={currentFilters.chain || ''}
                  onChange={(e) => handleFilterChange('chain', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  {chainOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">Token</label>
                <select
                  value={currentFilters.tokenType || ''}
                  onChange={(e) => handleFilterChange('tokenType', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                >
                  {tokenOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-400 text-xs mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearDateFilters}
                  className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200"
                >
                  Clear Dates
                </button>
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="mb-4">
              <label className="block text-gray-400 text-xs mb-2">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Last 7 days', days: 7 },
                  { label: 'Last 30 days', days: 30 },
                  { label: 'Last 90 days', days: 90 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(from.getDate() - days);
                      
                      const fromStr = from.toISOString().split('T')[0];
                      const toStr = to.toISOString().split('T')[0];
                      
                      setDateRange({ from: fromStr, to: toStr });
                      updateFilters({
                        dateFrom: from.toISOString(),
                        dateTo: to.toISOString(),
                      });
                    }}
                    className="px-3 py-1 bg-[#0795B0] text-white text-xs rounded hover:bg-[#0684A0] transition-colors duration-200"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Applied Filters Display */}
            {(currentFilters.status || currentFilters.type || currentFilters.chain || currentFilters.tokenType || currentFilters.dateFrom || currentFilters.dateTo) && (
              <div className="mb-4 p-3 bg-[#0A0E0E] rounded border border-[#0795B0]/30">
                <p className="text-gray-400 text-xs mb-2">Applied Filters:</p>
                <div className="flex flex-wrap gap-2">
                  {currentFilters.status && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                      Status: {currentFilters.status}
                    </span>
                  )}
                  {currentFilters.type && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                      Type: {currentFilters.type.replace('_', ' ')}
                    </span>
                  )}
                  {currentFilters.chain && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                      Chain: {currentFilters.chain}
                    </span>
                  )}
                  {currentFilters.tokenType && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                      Token: {currentFilters.tokenType}
                    </span>
                  )}
                  {currentFilters.dateFrom && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">
                      From: {new Date(currentFilters.dateFrom).toLocaleDateString()}
                    </span>
                  )}
                  {currentFilters.dateTo && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                      To: {new Date(currentFilters.dateTo).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex justify-between items-center">
              <div className="text-gray-400 text-xs">
                {summary && `Showing ${transactions.length} of ${summary.total} transactions`}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] transition-colors duration-200"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <h3 className="text-white font-semibold mb-2">No Transactions Found</h3>
            <p className="text-gray-400">Your transaction history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}

        {/* Load More - Optimized for performance */}
        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-[#0795B0] text-white rounded hover:bg-[#0684A0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loadingMore ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading more transactions...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>📄</span>
                  <span>Load More (5 at a time)</span>
                </div>
              )}
            </button>
            <p className="text-gray-400 text-xs mt-2">
              Loading 5 transactions at a time for better performance
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowDetails(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

// Enhanced Transaction Details Modal Component
const TransactionDetailsModal: React.FC<{
  transaction: Transaction;
  onClose: () => void;
}> = ({ transaction, onClose }) => {
  const {
    id,
    type,
    status,
    token,
    values,
    blockchain,
    timing,
    dashboard,
    user,
    mpesa,
    conversion,
  } = transaction;

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; bg: string; icon: string }> = {
      completed: { text: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20', icon: '✅' },
      pending: { text: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '⏳' },
      processing: { text: 'Processing', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '🔄' },
      failed: { text: 'Failed', color: 'text-red-400', bg: 'bg-red-500/20', icon: '❌' },
      error: { text: 'Error', color: 'text-red-500', bg: 'bg-red-600/20', icon: '⚠️' },
      reserved: { text: 'Reserved', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🔒' },
    };
    return statusMap[status] || statusMap.completed;
  };

  const statusDisplay = getStatusDisplay(status);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    console.log(`${label} copied to clipboard: ${text}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#0795B0]">
          <div>
            <h3 className="text-2xl font-bold text-white">Transaction Details</h3>
            <p className="text-gray-400 text-sm">ID: {id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-4 m-6 rounded-lg ${statusDisplay.bg} border border-current`}>
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{statusDisplay.icon}</div>
            <div>
              <h4 className={`text-xl font-semibold ${statusDisplay.color}`}>
                {statusDisplay.text}
              </h4>
              <p className="text-gray-300">
                {dashboard?.summary || `${type.replace('_', ' ')} transaction processed`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Main Transaction Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Transaction Details */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Transaction Information</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white font-medium capitalize">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Token</span>
                    <span className="text-white font-medium">
                      {token.amount} {token.symbol}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-[#1A1E1E] rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Amount Values</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">USD:</span>
                        <span className="text-white">{values.usd.formatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">KES:</span>
                        <span className="text-white">{values.kes.formatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Fiat:</span>
                        <span className="text-white">{values.fiat.formatted}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Details */}
              {conversion && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Conversion Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Direction</span>
                      <span className="text-white font-medium">{conversion.direction}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Rate</span>
                      <span className="text-white font-medium">{conversion.rateDisplay}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Effective Rate</span>
                      <span className="text-white font-medium">{conversion.effectiveRate}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* M-Pesa Details */}
              {mpesa && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">M-Pesa Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <span className="text-gray-400">Transaction ID</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-300 font-mono text-sm">{mpesa.transactionId}</span>
                        <button
                          onClick={() => copyToClipboard(mpesa.transactionId, 'M-Pesa ID')}
                          className="text-green-400 hover:text-green-300 text-xs"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    {mpesa.receiptNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                        <span className="text-gray-400">Receipt Number</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-300 font-mono text-sm">{mpesa.receiptNumber}</span>
                          <button
                            onClick={() => copyToClipboard(mpesa.receiptNumber!, 'Receipt Number')}
                            className="text-green-400 hover:text-green-300 text-xs"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Blockchain & Timing */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Blockchain Information</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Network</span>
                    <span className="text-white font-medium">{blockchain.network}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Explorer</span>
                    <span className="text-white font-medium">{blockchain.explorerName}</span>
                  </div>
                  
                  <div className="p-3 bg-[#1A1E1E] rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Transaction Hash</span>
                      <button
                        onClick={() => copyToClipboard(blockchain.txHash, 'Transaction Hash')}
                        className="text-[#0795B0] hover:text-[#0AA5C0] text-xs"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p className="text-white font-mono text-xs break-all bg-[#0A0E0E] p-2 rounded">
                      {blockchain.txHash}
                    </p>
                  </div>

                  {/* Additional blockchain info if available */}
                  {blockchain.confirmations !== undefined && (
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Confirmations</span>
                      <span className="text-white font-medium">{blockchain.confirmations}</span>
                    </div>
                  )}
                  
                  {blockchain.networkFee !== undefined && (
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Network Fee</span>
                      <span className="text-white font-medium">{blockchain.networkFee} ETH</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Timing Information</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Created</span>
                    <span className="text-white text-sm">{formatDateTime(timing.createdAt)}</span>
                  </div>
                  
                  {timing.completedAt && (
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Completed</span>
                      <span className="text-white text-sm">{formatDateTime(timing.completedAt)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Processing Time</span>
                    <span className="text-white font-medium">{timing.processingTimeSeconds}s</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                    <span className="text-gray-400">Age</span>
                    <span className="text-white font-medium">
                      {transactionUtils.formatTimeAgo(timing.ageMinutes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Information (if available) */}
              {user && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">User Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Phone</span>
                      <span className="text-white font-medium">{user.phone}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#1A1E1E] rounded-lg">
                      <span className="text-gray-400">Email</span>
                      <span className="text-white font-medium">{user.email}</span>
                    </div>
                    <div className="p-3 bg-[#1A1E1E] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Wallet Address</span>
                        <button
                          onClick={() => copyToClipboard(user.wallet, 'Wallet Address')}
                          className="text-[#0795B0] hover:text-[#0AA5C0] text-xs"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p className="text-white font-mono text-xs break-all bg-[#0A0E0E] p-2 rounded">
                        {user.wallet}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#0795B0]">
            <button
              onClick={() => window.open(blockchain.explorerUrl, '_blank')}
              className="flex-1 bg-[#0795B0] text-white py-3 px-6 rounded-lg hover:bg-[#0684A0] transition-colors duration-200 font-medium"
            >
              🔍 View on {blockchain.explorerName}
            </button>
            <button
              onClick={() => copyToClipboard(blockchain.txHash, 'Transaction Hash')}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
            >
              📋 Copy Hash
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
