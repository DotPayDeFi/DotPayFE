"use client";

import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useBusinessFinance } from '@/hooks/useBusinessFinance';
import Link from 'next/link';

interface BusinessTransactionsProps {
  className?: string;
  showDebug?: boolean;
}

export const BusinessTransactions: React.FC<BusinessTransactionsProps> = ({ 
  className = "", 
  showDebug = false 
}) => {
  const { currentBusiness } = useBusiness();
  const {
    businessTransactions,
    transactionsLoading,
    transactionsError,
    getBusinessTransactionHistory
  } = useBusinessFinance();
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load business transactions when component mounts
  useEffect(() => {
    if (currentBusiness?.businessId) {
      getBusinessTransactionHistory(currentBusiness.businessId, {
        page: 1,
        limit: 10
      });
    }
  }, [currentBusiness, getBusinessTransactionHistory]);

  // Lightweight transaction item component
  const TransactionItem: React.FC<{ transaction: any }> = ({ transaction }) => {
    const { type, status, amount, tokenType, chain, createdAt, completedAt, transactionCategory, transactionSubType } = transaction;
    
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
    
    // Status color mapping
    const getStatusColor = (status: string) => {
      const statusColors: Record<string, string> = {
        completed: 'text-green-400',
        processing: 'text-blue-400',
        pending: 'text-yellow-400',
        failed: 'text-red-400',
        error: 'text-red-500',
      };
      return statusColors[status] || 'text-green-400';
    };

    // Type icon mapping
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'business_to_personal': return '↗️';
        case 'business_crypto_to_fiat': return '💰';
        case 'crypto_to_paybill': return '📱';
        case 'crypto_to_till': return '🏪';
        default: return '💳';
      }
    };

    // Time format
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    };

    // Status display text
    const getStatusText = (status: string) => {
      const statusTexts: Record<string, string> = {
        completed: 'Success',
        processing: 'Processing',
        pending: 'Pending',
        failed: 'Failed',
        error: 'Error',
      };
      return statusTexts[status] || 'Success';
    };

    return (
      <div className="flex items-center justify-between p-3 bg-[#1A1E1E] rounded-lg border border-[#0795B0] hover:border-[#0AA5C0] transition-colors duration-200">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="text-lg shrink-0">{getTypeIcon(type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-white font-medium text-sm">
                {amount} {tokenType}
              </p>
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
              {formatTime(createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right">
            <div className={`text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </div>
            <div className="text-xs text-gray-400">
              {chain}
            </div>
          </div>
          
          <button
            onClick={() => {
              setSelectedTransaction(transaction);
              setShowDetails(true);
            }}
            className="px-3 py-1 bg-[#0795B0] text-white text-xs rounded hover:bg-[#0684A0] transition-colors duration-200"
          >
            Details
          </button>
        </div>
      </div>
    );
  };

  const handleRefresh = () => {
    if (currentBusiness?.businessId) {
      getBusinessTransactionHistory(currentBusiness.businessId, {
        page: 1,
        limit: 10
      });
    }
  };

  // Transaction Details Modal (simplified version)
  const TransactionDetailsModal: React.FC<{ 
    transaction: any; 
    onClose: () => void; 
  }> = ({ transaction, onClose }) => {
    const { 
      type, status, amount, tokenType, chain, createdAt, completedAt, transactionId
    } = transaction;

    const getStatusColor = (status: string) => {
      const statusColors: Record<string, string> = {
        completed: 'text-green-400',
        processing: 'text-blue-400',
        pending: 'text-yellow-400',
        failed: 'text-red-400',
        error: 'text-red-500',
      };
      return statusColors[status] || 'text-green-400';
    };

    const getStatusText = (status: string) => {
      const statusTexts: Record<string, string> = {
        completed: 'Success',
        processing: 'Processing',
        pending: 'Pending',
        failed: 'Failed',
        error: 'Error',
      };
      return statusTexts[status] || 'Success';
    };

    const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Business Transaction Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              ✕
            </button>
          </div>

          {/* Status Banner */}
          <div className={`p-4 rounded-lg mb-6 ${
            getStatusText(status) === 'Success' ? 'bg-green-500/20 border border-green-500' :
            getStatusText(status) === 'Pending' ? 'bg-yellow-500/20 border border-yellow-500' :
            getStatusText(status) === 'Processing' ? 'bg-blue-500/20 border border-blue-500' :
            'bg-red-500/20 border border-red-500'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`text-2xl ${getStatusColor(status)}`}>
                {getStatusText(status) === 'Success' ? '✅' : 
                 getStatusText(status) === 'Pending' ? '⏳' : 
                 getStatusText(status) === 'Processing' ? '🔄' : '❌'}
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </h4>
                <p className="text-gray-300 text-sm">
                  Business transaction processed
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <h4 className="text-gray-400 text-sm mb-2">Transaction Type</h4>
                <p className="text-white font-medium capitalize">{type.replace('_', ' ')}</p>
              </div>
              
              <div>
                <h4 className="text-gray-400 text-sm mb-2">Amount</h4>
                <p className="text-white font-medium">
                  {amount} {tokenType}
                </p>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">Transaction ID</h4>
                <p className="text-white font-mono text-sm">{transactionId}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <h4 className="text-gray-400 text-sm mb-2">Blockchain</h4>
                <p className="text-white font-medium capitalize">{chain}</p>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">Timing</h4>
                <div className="space-y-1">
                  <p className="text-white text-sm">Created: {formatDateTime(createdAt)}</p>
                  {completedAt && (
                    <p className="text-white text-sm">Completed: {formatDateTime(completedAt)}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">Business Info</h4>
                <p className="text-white text-sm">Business: {currentBusiness?.businessName}</p>
                <p className="text-gray-300 text-sm">Merchant ID: {currentBusiness?.merchantId}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6 pt-6 border-t border-[#0795B0]">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!currentBusiness) {
    return (
      <div className={`p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-gray-400 text-sm">No business account selected</p>
        </div>
      </div>
    );
  }

  if (transactionsLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-3 bg-[#1A1E1E] rounded-lg border border-[#0795B0] animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-600 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactionsError) {
    return (
      <div className={`p-4 bg-red-500/20 border border-red-500 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-red-300 text-sm mb-2">{transactionsError}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!businessTransactions || businessTransactions.transactions.length === 0) {
    return (
      <div className={`p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-2xl mb-2">🏢</div>
          <p className="text-gray-400 text-sm">No business transactions yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Business transactions will appear here when customers pay your business
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {/* Business Transactions Header */}
        <div className="flex items-center justify-between p-2 bg-[#1A1E1E] border border-[#0795B0] rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#0795B0] rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-300">
              Business Transactions: {currentBusiness.businessName}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {businessTransactions.transactions.length} transactions
          </div>
        </div>
        
        {businessTransactions.transactions.map((transaction) => (
          <TransactionItem key={transaction._id} transaction={transaction} />
        ))}
        
        <div className="flex justify-between items-center pt-2">
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="text-gray-400 hover:text-white text-xs transition-colors duration-200"
            >
              Refresh
            </button>
          </div>
          <Link
            href="/transactions"
            className="text-[#0795B0] hover:text-[#0AA5C0] text-sm transition-colors duration-200"
          >
            View all transactions →
          </Link>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowDetails(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </>
  );
};
