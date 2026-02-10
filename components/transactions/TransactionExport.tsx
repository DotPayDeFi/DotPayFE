"use client";

import React, { useState } from 'react';
import { transactionAPI } from '../../lib/transactions';
import { TransactionHistoryFilters } from '../../types/transaction-types';

interface TransactionExportProps {
  filters?: TransactionHistoryFilters;
  className?: string;
}

export const TransactionExport: React.FC<TransactionExportProps> = ({ 
  filters = {}, 
  className = "" 
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportFilters, setExportFilters] = useState<TransactionHistoryFilters>(filters);

  const handleExport = async () => {
    try {
      setExporting(true);
      
      console.log('📊 Exporting transactions with filters:', exportFilters);
      
      const blob = await transactionAPI.exportTransactions(exportFilters, exportFormat);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `dotpay-transactions-${timestamp}.${exportFormat}`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Export completed:', filename);
    } catch (error: any) {
      console.error('❌ Export failed:', error);
      // You could add a toast notification here
    } finally {
      setExporting(false);
    }
  };

  const updateExportFilter = (key: keyof TransactionHistoryFilters, value: string) => {
    setExportFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearExportFilters = () => {
    setExportFilters({});
  };

  const setDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    setExportFilters(prev => ({
      ...prev,
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    }));
  };

  return (
    <div className={`bg-[#0A0E0E] border border-[#0795B0] rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Export Transactions</h3>
          <p className="text-gray-400 text-sm">Download transaction data in CSV or JSON format</p>
        </div>
        <div className="text-4xl">📊</div>
      </div>

      {/* Export Format Selection */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm mb-3">Export Format</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="csv"
              checked={exportFormat === 'csv'}
              onChange={(e) => setExportFormat(e.target.value as 'csv')}
              className="text-[#0795B0] focus:ring-[#0795B0]"
            />
            <span className="text-white">CSV (Excel compatible)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="json"
              checked={exportFormat === 'json'}
              onChange={(e) => setExportFormat(e.target.value as 'json')}
              className="text-[#0795B0] focus:ring-[#0795B0]"
            />
            <span className="text-white">JSON (Raw data)</span>
          </label>
        </div>
      </div>

      {/* Export Filters */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-4">Export Filters</h4>
        
        {/* Quick Date Ranges */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Quick Date Ranges</label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All Time', days: null },
              { label: 'Last 7 days', days: 7 },
              { label: 'Last 30 days', days: 30 },
              { label: 'Last 90 days', days: 90 },
              { label: 'Last Year', days: 365 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => days ? setDateRange(days) : setExportFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined }))}
                className="px-3 py-1 bg-[#1A1E1E] border border-[#0795B0] text-white text-sm rounded hover:bg-[#0A0E0E] transition-colors duration-200"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Status</label>
            <select
              value={exportFilters.status || ''}
              onChange={(e) => updateExportFilter('status', e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Type</label>
            <select
              value={exportFilters.type || ''}
              onChange={(e) => updateExportFilter('type', e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            >
              <option value="">All Types</option>
              <option value="token_transfer">Token Transfer</option>
              <option value="fiat_to_crypto">Buy Crypto</option>
              <option value="crypto_to_fiat">Sell Crypto</option>
              <option value="crypto_to_paybill">Pay Bill</option>
              <option value="crypto_to_till">Till Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Chain</label>
            <select
              value={exportFilters.chain || ''}
              onChange={(e) => updateExportFilter('chain', e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            >
              <option value="">All Chains</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="celo">Celo</option>
              <option value="polygon">Polygon</option>
              <option value="base">Base</option>
              <option value="optimism">Optimism</option>
              <option value="ethereum">Ethereum</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Token</label>
            <select
              value={exportFilters.tokenType || ''}
              onChange={(e) => updateExportFilter('tokenType', e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            >
              <option value="">All Tokens</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="WETH">WETH</option>
              <option value="WBTC">WBTC</option>
              <option value="DAI">DAI</option>
              <option value="CELO">CELO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applied Filters Display */}
      {Object.keys(exportFilters).some(key => (exportFilters as any)[key] !== undefined) && (
        <div className="mb-6 p-4 bg-[#1A1E1E] rounded-lg border border-[#0795B0]/30">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-white font-medium">Applied Export Filters</h5>
            <button
              onClick={clearExportFilters}
              className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(exportFilters).map(([key, value]) => {
              if (!value) return null;
              
              let displayValue = value;
              if (key === 'dateFrom' || key === 'dateTo') {
                displayValue = new Date(value).toLocaleDateString();
              }
              
              return (
                <span
                  key={key}
                  className="px-2 py-1 bg-[#0795B0]/20 text-[#0795B0] text-xs rounded border border-[#0795B0]/30"
                >
                  {key}: {displayValue}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="flex items-center justify-between">
        <div className="text-gray-400 text-sm">
          {exportFormat === 'csv' 
            ? 'CSV files can be opened in Excel, Google Sheets, or any spreadsheet application'
            : 'JSON files contain raw transaction data for programmatic use'
          }
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-6 py-3 bg-[#0795B0] text-white rounded-lg hover:bg-[#0684A0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
        >
          {exporting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Exporting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>📊</span>
              <span>Export {exportFormat.toUpperCase()}</span>
            </div>
          )}
        </button>
      </div>

      {/* Export Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="text-blue-400 text-lg">ℹ️</div>
          <div className="text-blue-300 text-sm">
            <p className="font-medium mb-1">Export Information:</p>
            <ul className="space-y-1 text-xs">
              <li>• Exports include all transaction details: amounts, hashes, timestamps, user info</li>
              <li>• Large exports may take a few moments to process</li>
              <li>• CSV format is recommended for analysis in spreadsheet applications</li>
              <li>• JSON format preserves all data types and nested structures</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};