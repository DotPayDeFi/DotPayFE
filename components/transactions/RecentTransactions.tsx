"use client";

import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../../lib/transactions';
import { Transaction } from '../../types/transaction-types';
import Link from 'next/link';

/*
 * 🔍 TRANSACTION API ENDPOINT GUIDE
 * 
 * Expected API Response Structure for /transactions/history:
 * 
 * {
 *   "success": true,
 *   "message": "Enhanced transaction history retrieved successfully",
 *   "data": {
 *     "transactions": [
 *       {
 *         "id": "TXN_123456",
 *         "type": "token_transfer",
 *         "status": "completed",           // ✅ REQUIRED: completed, pending, failed
 *         "token": {
 *           "symbol": "USDC",
 *           "name": "USD Coin",
 *           "amount": 0.1,
 *           "decimals": 6
 *         },
 *         "values": {
 *           "fiat": { "amount": 13.35, "currency": "KES", "formatted": "KES 13" },
 *           "usd": { "amount": 0.1, "formatted": "$0.10", "rate": 1.0 },
 *           "kes": { "amount": 13.35, "formatted": "KES 13", "rate": 133.5 }
 *         },
 *         "blockchain": {
 *           "chain": "arbitrum",
 *           "network": "Arbitrum One",
 *           "txHash": "0xcf008ad6ee461cac18c6518c78e7a5ca900534c8d6392d3c7c5cf136b109f1b3",
 *           "explorerUrl": "https://arbiscan.io/tx/0xcf008ad6ee461cac18c6518c78e7a5ca900534c8d6392d3c7c5cf136b109f1b3",
 *           "explorerName": "Arbiscan"
 *         },
 *         "portfolio": {
 *           "impact": "negative",
 *           "direction": "-",
 *           "description": "Outgoing transfer"
 *         },
 *         "timing": {
 *           "createdAt": "2025-09-01T11:33:14.743Z",  // ✅ REQUIRED
 *           "completedAt": "2025-09-01T11:33:14.743Z",
 *           "processingTimeSeconds": 19,
 *           "ageMinutes": 45,                           // ✅ REQUIRED for time display
 *           "formatted": {
 *             "created": "9/1/2025, 2:33:14 PM",
 *             "completed": "9/1/2025, 2:33:14 PM"
 *           }
 *         },
 *         "references": {
 *           "transactionId": "TXN_123456",
 *           "mpesaTransactionId": null,
 *           "retryCount": 0
 *         },
 *         "dashboard": {
 *           "priority": "normal",
 *           "category": "transfer",
 *           "statusColor": "green",
 *           "icon": "send",
 *           "summary": "Sent 0.1 USDC on Arbitrum - $0.10 (KES 13)"
 *         }
 *       }
 *     ],
 *     "summary": { "total": 25, "page": 1, "limit": 10, "pages": 3, "hasNext": true, "hasPrev": false },
 *     "filters": { "applied": ["status=completed"], "available": { "statuses": ["pending", "completed", "failed"] } }
 *   }
 * }
 * 
 * 🚨 CRITICAL FIELDS:
 * - status: Must be "completed", "processing", "pending", "failed", "error", or "reserved"
 * - timing.ageMinutes: Must be a number for proper time display
 * - timing.createdAt: Must be ISO8601 date string
 * - blockchain.txHash: Must be present for transaction hash display
 * - amount: Total transaction amount
 * - user: Optional user info (for admin endpoints)
 * - mpesa: Optional M-Pesa transaction details
 * - conversion: Optional conversion details for fiat-crypto transactions
 * - statusValidation: Optional status correction metadata
 * 
 * 🔧 CURRENT FIXES APPLIED:
 * - Automatic status validation by API (no more manual detection needed)
 * - Status corrections are automatically applied and logged
 * - Enhanced status display with correction notices
 * - Fallback status to "completed" if missing
 * - Calculated ageMinutes from createdAt if missing
 * - Comprehensive logging for debugging
 * - Data validation before display
 * - Support for new API structure with enhanced fields
 * - Status correction tracking and display
 */

interface RecentTransactionsProps {
  className?: string;
  showDebug?: boolean;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ className = "", showDebug = true }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Cache key for localStorage
  const CACHE_KEY = 'dotpay_recent_transactions';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Lightweight transaction item component
  const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const { type, status, token, values, blockchain, timing, statusValidation, transactionCategory, transactionSubType } = transaction;
    
    // Defensive check for values
    if (!values || !values.usd) {
      console.error('⚠️ Transaction missing values:', transaction.id, transaction);
      // Provide fallback values
      const fallbackValues = {
        fiat: { amount: 0, currency: 'KES', formatted: 'KES 0' },
        usd: { amount: 0, formatted: '$0.00' },
        kes: { amount: 0, formatted: 'KES 0' }
      };
      // Use fallback if values is missing
      if (!values) {
        (transaction as any).values = fallbackValues;
      } else if (!values.usd) {
        values.usd = fallbackValues.usd;
      }
    }
    
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
    
    // Enhanced status detection with automatic validation support
    const getStatusColor = (status: string, transaction: Transaction) => {
      console.log('🎨 Status color check for:', status, 'Type:', transaction.type);
      
      // Use the API's validated status (the API now handles automatic correction)
      const finalStatus = status;
      
      // Status color mapping based on validated status
      const statusColors: Record<string, string> = {
        completed: 'text-green-400',
        processing: 'text-blue-400',
        pending: 'text-yellow-400',
        failed: 'text-red-400',
        error: 'text-red-500',
        reserved: 'text-orange-400',
      };
      
      const color = statusColors[finalStatus] || 'text-green-400';
      console.log(`✅ Status "${finalStatus}" → Color: ${color}`);
      
      // Log if status was corrected
      if (statusValidation?.wasCorrected) {
        console.log(`🔄 Status was corrected from "${statusValidation.originalStatus}" to "${finalStatus}"`);
        console.log(`📝 Reason: ${statusValidation.correctionReason}`);
      }
      
      return color;
    };

    // Enhanced type icon
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'token_transfer': return '↗️';
        case 'fiat_to_crypto': return '💰';
        case 'crypto_to_fiat': return '💸';
        case 'crypto_to_paybill': return '📱';
        case 'crypto_to_till': return '🏪';
        default: return '💳';
      }
    };

    // Enhanced time format
    const formatTime = (ageMinutes: number) => {
      console.log('⏰ Time formatting for ageMinutes:', ageMinutes);
      
      // Handle invalid or missing ageMinutes
      if (!ageMinutes || isNaN(ageMinutes) || ageMinutes < 0) {
        console.log('⚠️ Invalid ageMinutes, using fallback');
        return 'Recently';
      }
      
      if (ageMinutes < 1) {
        console.log('⏰ Time: Just now');
        return 'Just now';
      }
      if (ageMinutes < 60) {
        const minutes = Math.floor(ageMinutes);
        console.log('⏰ Time:', `${minutes}m ago`);
        return `${minutes}m ago`;
      }
      if (ageMinutes < 1440) {
        const hours = Math.floor(ageMinutes / 60);
        console.log('⏰ Time:', `${hours}h ago`);
        return `${hours}h ago`;
      }
      
      const days = Math.floor(ageMinutes / 1440);
      console.log('⏰ Time:', `${days}d ago`);
      return `${days}d ago`;
    };

    // Get status display text with automatic validation support
    const getStatusText = (status: string, transaction: Transaction) => {
      console.log('📝 Status text check for:', status, 'Type:', transaction.type);
      
      // Use the API's validated status
      const finalStatus = status;
      
      // Status text mapping based on validated status
      const statusTexts: Record<string, string> = {
        completed: 'Success',
        processing: 'Processing',
        pending: 'Pending',
        failed: 'Failed',
        error: 'Error',
        reserved: 'Reserved',
      };
      
      const text = statusTexts[finalStatus] || 'Success';
      console.log(`✅ Status "${finalStatus}" → Text: ${text}`);
      
      // Log if status was corrected
      if (statusValidation?.wasCorrected) {
        console.log(`🔄 Status was corrected from "${statusValidation.originalStatus}" to "${finalStatus}"`);
      }
      
      return text;
    };

    return (
      <div className="flex items-center justify-between p-3 bg-[#1A1E1E] rounded-lg border border-[#0795B0] hover:border-[#0AA5C0] transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <div className="text-lg">{getTypeIcon(type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-white font-medium text-sm">
                {token.amount} {token.symbol}
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
              {values?.usd?.formatted || '$0.00'} • {formatTime(timing?.ageMinutes || 0)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right">
            <div className={`text-xs font-medium ${getStatusColor(status, transaction)}`}>
              {getStatusText(status, transaction)}
            </div>
            <div className="text-xs text-gray-400">
              {blockchain.chain}
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

  // Load transactions with caching
  const loadTransactions = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          
          // Use cache if less than 5 minutes old
          if (now - timestamp < CACHE_DURATION) {
            console.log('📦 Using cached transactions:', data.length);
            // Validate cached data has proper structure
            const validatedCached = data.map((t: any) => {
              if (!t.values || !t.values.usd) {
                const amount = t.amount || t.token?.amount || 0;
                t.values = {
                  fiat: { amount: amount * 133.5, currency: 'KES', formatted: `KES ${Math.round(amount * 133.5)}` },
                  usd: { amount: amount, formatted: `$${amount.toFixed(2)}` },
                  kes: { amount: amount * 133.5, formatted: `KES ${Math.round(amount * 133.5)}` }
                };
              }
              return t;
            });
            setTransactions(validatedCached.slice(0, 5)); // Only show first 5
            setLoading(false);
            return;
          }
        }
      }

      console.log('🔄 Fetching fresh transactions...');
      console.log('🔍 Auth token check:', localStorage.getItem('dotpay_token') ? '✅ Present' : '❌ Missing');
      
      // Fetch fresh data
      const response = await transactionAPI.getHistory({ 
        page: 1, 
        limit: 10 // Fetch more to ensure we have enough
      });
      
      console.log('📊 Full API Response:', response);
      console.log('📊 Response success:', response.success);
      console.log('📊 Response data:', response.data);
      console.log('📊 Transactions array:', response.data?.transactions);
      console.log('📊 Transactions length:', response.data?.transactions?.length);
      
      if (response.success && response.data?.transactions) {
        const recentTransactions = response.data.transactions.slice(0, 5);
        console.log('✅ Transactions loaded:', recentTransactions.length);
        console.log('📋 First transaction sample:', JSON.stringify(recentTransactions[0], null, 2));
        console.log('🔍 Status values found:', recentTransactions.map(t => ({ 
          id: t.id, 
          status: t.status, 
          type: t.type,
          timing: t.timing?.ageMinutes,
          createdAt: t.timing?.createdAt,
          token: t.token?.symbol,
          amount: t.token?.amount
        })));
        
        // Validate and normalize transaction data
        const validatedTransactions = recentTransactions.map(transaction => {
          console.log('🔍 Validating transaction:', transaction.id);
          console.log('🔍 Transaction structure:', {
            hasValues: !!transaction.values,
            hasUsd: !!transaction.values?.usd,
            hasTiming: !!transaction.timing,
            hasToken: !!transaction.token
          });
          
          // Check if we have the expected data structure
          if (!transaction.status) {
            console.warn('⚠️ Missing status for transaction:', transaction.id);
            transaction.status = 'completed';
          }
          
          // Ensure values object exists with all required fields
          if (!transaction.values) {
            console.warn('⚠️ Missing values for transaction:', transaction.id);
            const amount = transaction.amount || transaction.token?.amount || 0;
            transaction.values = {
              fiat: { amount: amount * 133.5, currency: 'KES', formatted: `KES ${Math.round(amount * 133.5)}` },
              usd: { amount: amount, formatted: `$${amount.toFixed(2)}` },
              kes: { amount: amount * 133.5, formatted: `KES ${Math.round(amount * 133.5)}` }
            };
          } else if (!transaction.values.usd) {
            console.warn('⚠️ Missing usd in values for transaction:', transaction.id);
            const amount = transaction.amount || transaction.token?.amount || 0;
            transaction.values.usd = { amount: amount, formatted: `$${amount.toFixed(2)}` };
          }
          
          // Ensure timing exists
          if (!transaction.timing) {
            console.warn('⚠️ Missing timing for transaction:', transaction.id);
            transaction.timing = {
              createdAt: new Date().toISOString(),
              processingTimeSeconds: 0,
              ageMinutes: 0,
              formatted: { created: new Date().toLocaleString() }
            };
          } else if (!transaction.timing.ageMinutes && transaction.timing.createdAt) {
            // Calculate age from createdAt if ageMinutes is missing
            const createdAt = new Date(transaction.timing.createdAt);
            const now = new Date();
            const ageMs = now.getTime() - createdAt.getTime();
            const ageMinutes = ageMs / (1000 * 60);
            transaction.timing.ageMinutes = ageMinutes;
            console.log('🕐 Calculated ageMinutes:', ageMinutes, 'for transaction:', transaction.id);
          }
          
          return transaction;
        });
        
        setTransactions(validatedTransactions);
        
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: validatedTransactions,
          timestamp: Date.now()
        }));
        
        console.log('✅ Transactions set successfully:', validatedTransactions.length);
      } else {
        console.error('❌ API response error:', response);
        console.error('❌ Response structure:', {
          success: response.success,
          hasData: !!response.data,
          hasTransactions: !!response.data?.transactions,
          transactionsLength: response.data?.transactions?.length
        });
        
        // Try to provide fallback data if possible
        if (response.data?.transactions && response.data.transactions.length === 0) {
          console.log('⚠️ No transactions found, showing empty state');
          setTransactions([]);
        } else {
          setError('Failed to load transactions');
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading transactions:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Show fallback data for development/debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ Development mode: Showing fallback data');
        const fallbackTransactions: Transaction[] = [
          {
            id: 'fallback-1',
            type: 'token_transfer' as const,
            status: 'completed' as const,
            amount: 1,
            token: {
              symbol: 'USDC',
              name: 'USD Coin',
              amount: 1,
              decimals: 6
            },
            values: {
              fiat: { amount: 129.13, currency: 'KES', formatted: 'KES 129' },
              usd: { amount: 1, formatted: '$1.00' },
              kes: { amount: 129.13, formatted: 'KES 129' }
            },
            blockchain: {
              chain: 'arbitrum',
              network: 'Arbitrum One',
              txHash: '0xb1ba5980fc0f3fae2fbf3294a3363ddafc447096427734f3219d0a50aafa5cc8',
              explorerUrl: 'https://arbiscan.io/tx/0xb1ba5980fc0f3fae2fbf3294a3363ddafc447096427734f3219d0a50aafa5cc8',
              explorerName: 'Arbiscan'
            },
            timing: {
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              processingTimeSeconds: 15,
              ageMinutes: 5,
              formatted: {
                created: new Date().toLocaleString(),
                completed: new Date().toLocaleString()
              }
            },
            dashboard: {
              priority: 'normal',
              category: 'transfer',
              statusColor: 'green',
              icon: 'send',
              summary: 'Sent 1 USDC on Arbitrum - $1.00 (KES 129)'
            }
          },
          {
            id: 'fallback-2',
            type: 'fiat_to_crypto' as const,
            status: 'completed' as const,
            amount: 5,
            token: {
              symbol: 'USDC',
              name: 'USD Coin',
              amount: 5,
              decimals: 6
            },
            values: {
              fiat: { amount: 645.65, currency: 'KES', formatted: 'KES 646' },
              usd: { amount: 5, formatted: '$5.00' },
              kes: { amount: 645.65, formatted: 'KES 646' }
            },
            blockchain: {
              chain: 'arbitrum',
              network: 'Arbitrum One',
              txHash: '0xc6324aecf8828bc624b9f5f4269517a70b1f5badbb769b224b28e8ac4014a24f',
              explorerUrl: 'https://arbiscan.io/tx/0xc6324aecf8828bc624b9f5f4269517a70b1f5badbb769b224b28e8ac4014a24f',
              explorerName: 'Arbiscan'
            },
            timing: {
              createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
              completedAt: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
              processingTimeSeconds: 60,
              ageMinutes: 30,
              formatted: {
                created: new Date(Date.now() - 30 * 60 * 1000).toLocaleString(),
                completed: new Date(Date.now() - 29 * 60 * 1000).toLocaleString()
              }
            },
            dashboard: {
              priority: 'normal',
              category: 'Buy Crypto',
              statusColor: 'green',
              icon: 'buy',
              summary: 'Bought 5 USDC for KES 646 on Arbitrum'
            }
          }
        ];
        
        setTransactions(fallbackTransactions);
        console.log('🛠️ Fallback transactions set:', fallbackTransactions.length);
      } else {
        setError('Failed to load transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear cache function
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    loadTransactions(true);
  };

  // Transaction Details Modal
  const TransactionDetailsModal: React.FC<{ 
    transaction: Transaction; 
    onClose: () => void; 
  }> = ({ transaction, onClose }) => {
    const { 
      type, status, token, values, blockchain, timing, dashboard, user, mpesa, conversion, statusValidation
    } = transaction;

    const getStatusColor = (status: string, transaction: Transaction) => {
      // Use the API's validated status
      const statusColors: Record<string, string> = {
        completed: 'text-green-400',
        processing: 'text-blue-400',
        pending: 'text-yellow-400',
        failed: 'text-red-400',
        error: 'text-red-500',
        reserved: 'text-orange-400',
      };
      return statusColors[status] || 'text-green-400';
    };

    const getStatusText = (status: string, transaction: Transaction) => {
      // Use the API's validated status
      const statusTexts: Record<string, string> = {
        completed: 'Success',
        processing: 'Processing',
        pending: 'Pending',
        failed: 'Failed',
        error: 'Error',
        reserved: 'Reserved',
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
            <h3 className="text-xl font-bold text-white">Transaction Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              ✕
            </button>
          </div>

          {/* Status Banner */}
          <div className={`p-4 rounded-lg mb-6 ${
            getStatusText(status, transaction) === 'Success' ? 'bg-green-500/20 border border-green-500' :
            getStatusText(status, transaction) === 'Pending' ? 'bg-yellow-500/20 border border-yellow-500' :
            getStatusText(status, transaction) === 'Processing' ? 'bg-blue-500/20 border border-blue-500' :
            'bg-red-500/20 border border-red-500'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`text-2xl ${getStatusColor(status, transaction)}`}>
                {getStatusText(status, transaction) === 'Success' ? '✅' : 
                 getStatusText(status, transaction) === 'Pending' ? '⏳' : 
                 getStatusText(status, transaction) === 'Processing' ? '🔄' : '❌'}
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${getStatusColor(status, transaction)}`}>
                  {getStatusText(status, transaction)}
                </h4>
                <p className="text-gray-300 text-sm">
                  {dashboard?.summary || 'Transaction processed'}
                </p>
                {statusValidation?.wasCorrected && (
                  <p className="text-blue-300 text-xs mt-1">
                    🔄 Status was automatically corrected based on blockchain data
                  </p>
                )}
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
                <h4 className="text-gray-400 text-sm mb-2">Token</h4>
                <p className="text-white font-medium">
                  {token.amount} {token.symbol} ({token.name})
                </p>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">Amount Values</h4>
                <div className="space-y-1">
                  <p className="text-white text-sm">{values.usd.formatted}</p>
                  <p className="text-gray-300 text-sm">{values.kes.formatted}</p>
                  <p className="text-gray-300 text-sm">{values.fiat.formatted}</p>
                </div>
              </div>

              {conversion && (
                <div>
                  <h4 className="text-gray-400 text-sm mb-2">Conversion Details</h4>
                  <div className="space-y-1">
                    <p className="text-white text-sm">{conversion.direction}</p>
                    <p className="text-gray-300 text-sm">{conversion.rateDisplay}</p>
                    <p className="text-gray-300 text-sm">Rate: {conversion.effectiveRate}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <h4 className="text-gray-400 text-sm mb-2">Blockchain</h4>
                <p className="text-white font-medium capitalize">{blockchain.network}</p>
                <p className="text-gray-300 text-sm">{blockchain.explorerName}</p>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">Transaction Hash</h4>
                <p className="text-white font-mono text-xs break-all">{blockchain.txHash}</p>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">Timing</h4>
                <div className="space-y-1">
                  <p className="text-white text-sm">Created: {formatDateTime(timing.createdAt)}</p>
                  {timing.completedAt && (
                    <p className="text-white text-sm">Completed: {formatDateTime(timing.completedAt)}</p>
                  )}
                  <p className="text-gray-300 text-sm">Processing: {timing.processingTimeSeconds}s</p>
                </div>
              </div>

              <div>
                <h4 className="text-gray-400 text-sm mb-2">References</h4>
                <p className="text-white text-sm">ID: {transaction.id}</p>
                {mpesa?.transactionId && (
                  <p className="text-gray-300 text-sm">M-Pesa: {mpesa.transactionId}</p>
                )}
                {mpesa?.receiptNumber && (
                  <p className="text-gray-300 text-sm">Receipt: {mpesa.receiptNumber}</p>
                )}
              </div>

              {user && (
                <div>
                  <h4 className="text-gray-400 text-sm mb-2">User Info</h4>
                  <p className="text-white text-sm">Phone: {user.phone}</p>
                  <p className="text-gray-300 text-sm">Email: {user.email}</p>
                  <p className="text-gray-300 text-sm">Wallet: {user.wallet}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6 pt-6 border-t border-[#0795B0]">
            <a
              href={blockchain.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#0795B0] text-white py-3 px-4 rounded-lg hover:bg-[#0684A0] transition-colors duration-200 text-center"
            >
              View on Explorer
            </a>
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

  // Load on mount
  useEffect(() => {
    loadTransactions();
  }, []);

  if (loading) {
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

  if (error) {
    return (
      <div className={`p-4 bg-red-500/20 border border-red-500 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-red-300 text-sm mb-2">{error}</p>
          <button
            onClick={() => loadTransactions()}
            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
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
    <>
      <div className={`space-y-3 ${className}`}>
        {/* API Status Indicator */}
        <div className="flex items-center justify-between p-2 bg-[#1A1E1E] border border-[#0795B0] rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-300">
              API Status: {transactions.length > 0 ? 'Connected' : 'Loading...'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {transactions.length} transactions loaded
          </div>
        </div>
        
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
        
        <div className="flex justify-between items-center pt-2">
          <div className="flex space-x-2">
            <button
              onClick={() => loadTransactions(true)}
              className="text-gray-400 hover:text-white text-xs transition-colors duration-200"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(CACHE_KEY);
                loadTransactions(true);
              }}
              className="text-red-400 hover:text-red-300 text-xs transition-colors duration-200"
            >
              Clear Cache
            </button>
          </div>
          <Link
            href="/transactions"
            className="text-[#0795B0] hover:text-[#0AA5C0] text-sm transition-colors duration-200"
          >
            View all transactions →
          </Link>
        </div>
        
        {/* Enhanced Debug Panel */}
        {showDebug && (
        <details className="mt-4 p-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg">
          <summary className="text-[#0795B0] text-xs cursor-pointer hover:text-[#0AA5C0]">
            🔍 Debug Info - API Data Analysis
          </summary>
          <div className="mt-2 space-y-3 text-xs text-gray-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Transactions loaded:</strong> {transactions.length}
              </div>
              <div>
                <strong>Cache status:</strong> {localStorage.getItem(CACHE_KEY) ? 'Active' : 'None'}
              </div>
            </div>
            
            {transactions.length > 0 && (
              <div>
                <strong>Status Analysis:</strong>
                <div className="mt-1 space-y-1">
                  {transactions.map((tx, index) => (
                    <div key={tx.id} className="p-2 bg-[#0A0E0E] rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-white">#{index + 1}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.status === 'failed' ? 'bg-red-500/20 text-red-300' : 
                          tx.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-400">
                        <div>Type: {tx.type}</div>
                        <div>Hash: {tx.blockchain?.txHash ? '✅ Present' : '❌ Missing'}</div>
                        <div>Amount: {tx.token?.amount} {tx.token?.symbol}</div>
                        <div>Chain: {tx.blockchain?.chain}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <strong>Status Validation System:</strong>
              <div className="mt-1 p-2 bg-[#0A0E0E] rounded text-xs">
                <div>• API automatically validates and corrects statuses</div>
                <div>• Transactions with valid hashes → Marked as completed</div>
                <div>• Old transactions without hashes → Marked as failed</div>
                <div>• Status corrections are logged and preserved</div>
              </div>
            </div>
            
            {transactions.some(t => t.statusValidation?.wasCorrected) && (
              <div>
                <strong>Status Corrections:</strong>
                <div className="mt-1 p-2 bg-[#0A0E0E] rounded text-xs">
                  {transactions.filter(t => t.statusValidation?.wasCorrected).map((tx, index) => (
                    <div key={tx.id} className="mb-1">
                      <span className="text-blue-300">#{index + 1}:</span> {tx.statusValidation?.originalStatus} → {tx.status}
                      <div className="text-gray-400 text-xs ml-2">
                        {tx.statusValidation?.correctionReason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  console.log('🔍 Current transactions state:', transactions);
                  console.log('🔍 Cache data:', localStorage.getItem(CACHE_KEY));
                  console.log('🔍 Status analysis:', transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    status: tx.status,
                    hasHash: !!tx.blockchain?.txHash,
                    hash: tx.blockchain?.txHash
                  })));
                }}
                className="px-2 py-1 bg-[#0795B0] text-white text-xs rounded hover:bg-[#0684A0]"
              >
                Log Analysis
              </button>
              <button
                onClick={() => loadTransactions(true)}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Force Refresh
              </button>
              <button
                onClick={async () => {
                  console.log('🧪 Testing API connection...');
                  try {
                    const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/transactions/history?limit=1`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    const data = await response.json();
                    console.log('🧪 Direct API test response:', data);
                    alert(`API Test: ${response.status} - ${data.success ? 'Success' : 'Failed'}`);
                  } catch (error) {
                    console.error('🧪 Direct API test error:', error);
                    alert('API Test: Failed - Check console for details');
                  }
                }}
                className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
              >
                Test API
              </button>
            </div>
          </div>
        </details>
        )}
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
