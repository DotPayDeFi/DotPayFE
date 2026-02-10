"use client";

import React from 'react';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import { transactionUtils } from '../../lib/transactions';
import { Transaction } from '../../types/transaction-types';

interface TransactionListProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  limit = 5, 
  showFilters = false,
  className = ""
}) => {
  const {
    transactions,
    loading,
    error,
    refreshTransactions,
  } = useTransactionHistory();

  // Limit transactions for compact view
  const displayTransactions = transactions.slice(0, limit);

  const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const {
      type,
      status,
      token,
      values,
      blockchain,
      timing,
      dashboard,
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

    return (
      <div className="flex items-center justify-between p-3 bg-[#1A1E1E] rounded-lg border border-[#0795B0] hover:border-[#0AA5C0] transition-colors duration-200">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="text-lg shrink-0">{transactionUtils.getTypeIcon(type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-white font-medium text-sm">
                {transactionUtils.formatAmount(transaction)}
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
              {values.usd.formatted} • {transactionUtils.formatTimeAgo(timing.ageMinutes)}
            </p>
          </div>
        </div>
        
        <div className="text-right shrink-0">
          <div className={`text-xs font-medium ${transactionUtils.getStatusColor(status)}`}>
            {status}
          </div>
          <div className="text-xs text-gray-400">
            {blockchain.chain}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: limit }).map((_, index) => (
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

  if (error) {
    return (
      <div className={`p-4 bg-red-500/20 border border-red-500 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-red-300 text-sm mb-2">Failed to load transactions</p>
          <button
            onClick={refreshTransactions}
            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (displayTransactions.length === 0) {
    return (
      <div className={`p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-2xl mb-2">📋</div>
          <p className="text-gray-400 text-sm">No recent transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayTransactions.map((transaction) => (
        <TransactionItem key={transaction.id} transaction={transaction} />
      ))}
      
      {transactions.length > limit && (
        <div className="text-center pt-2">
          <a
            href="/transactions"
            className="text-[#0795B0] hover:text-[#0AA5C0] text-sm transition-colors duration-200"
          >
            View all transactions →
          </a>
        </div>
      )}
    </div>
  );
};

