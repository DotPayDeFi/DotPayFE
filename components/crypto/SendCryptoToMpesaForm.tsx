"use client";

import React, { useState, useEffect } from 'react';
import { useMpesa } from '../../hooks/useMpesa';
import { useGetConversionRate } from '@/hooks/apiHooks';

export const SendCryptoToMpesaForm: React.FC = () => {
  const { cryptoToMpesa, cryptoToMpesaLoading } = useMpesa();
  const { data: rate } = useGetConversionRate();
  
  const [formData, setFormData] = useState({
    amount: '', // Amount in KES or USD
    recipientPhone: '',
    chain: 'celo', // Default to celo as per backend
    tokenType: 'USDC',
  });
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Authentication field - only password is supported now
  const [password, setPassword] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('dotpay_user');
    if (user) {
      const userData = JSON.parse(user);
      setFormData(prev => ({ ...prev, recipientPhone: userData.phoneNumber || '' }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Check authentication first
    const token = localStorage.getItem('dotpay_token');
    if (!token) {
      setError('You must be logged in to send crypto. Please login first.');
      return;
    }

    // Validate additional authentication (password is now required)
    if (!password.trim()) {
      setError('Please enter your Password');
      return;
    }

    const kesPerUsd = rate ?? 130;
    const fiatAmount = parseFloat(formData.amount);
    if (isNaN(fiatAmount) || fiatAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    // Convert to USD-equivalent to send as amount (USDC ~= USD)
    const usdAmount = currency === 'USD' ? fiatAmount : fiatAmount / kesPerUsd;

    const payload = {
      amount: parseFloat(usdAmount.toFixed(6)),
      phone: formData.recipientPhone.startsWith('+')
        ? formData.recipientPhone.replace('+', '')
        : formData.recipientPhone,
      tokenType: formData.tokenType,
      chain: formData.chain,
      password: password, // password is now required
    };

    console.log('Submitting payload:', payload);
    console.log('Auth token:', token ? 'Present' : 'Missing');

    try {
      setProcessing(true);
      const response = await cryptoToMpesa(payload);
      if (response.success) {
        setResult(response.data || { message: response.message });
        setFormData(prev => ({ ...prev, amount: '' }));
        // Reset auth fields
        setPassword('');
      } else {
        setError(response.message || 'Failed to initiate');
      }
    } catch (err: any) {
      console.error('API Error:', err);
      if (err.response?.status === 403) {
        setError('Authentication failed. Please check your password.');
      } else if (err.response?.status === 401) {
        setError('Unauthorized. Please check your login status.');
      } else {
        setError(err?.response?.data?.message || err.message || 'Request failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Send Crypto → M-Pesa</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
            <div className="flex rounded-md shadow-sm">
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="flex-1 px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-l-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'KES' | 'USD')}
                className="px-3 py-3 bg-[#1A1E1E] border border-l-0 border-[#0795B0] rounded-r-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
              </select>
            </div>
            {rate && (
              <p className="text-xs text-gray-400 mt-1">Current rate: 1 USD = {rate.toFixed(2)} KES</p>
            )}
          </div>

          <div>
            <label htmlFor="recipientPhone" className="block text-sm font-medium text-gray-300 mb-2">Recipient Phone</label>
            <input
              type="tel"
              id="recipientPhone"
              name="recipientPhone"
              value={formData.recipientPhone}
              onChange={handleInputChange}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
              placeholder="254712345678"
              required
            />
          </div>

          <div>
            <label htmlFor="tokenType" className="block text-sm font-medium text-gray-300 mb-2">Token Type</label>
            <select
              id="tokenType"
              name="tokenType"
              value={formData.tokenType}
              onChange={handleInputChange}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="DAI">DAI</option>
            </select>
          </div>

          <div>
            <label htmlFor="chain" className="block text-sm font-medium text-gray-300 mb-2">Blockchain</label>
            <select
              id="chain"
              name="chain"
              value={formData.chain}
              onChange={handleInputChange}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
            >
              <option value="celo">Celo</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="polygon">Polygon</option>
              <option value="base">Base</option>
              <option value="optimism">Optimism</option>
              <option value="scroll">Scroll</option>
              <option value="fuse">Fuse</option>
              <option value="gnosis">Gnosis</option>
              <option value="aurora">Aurora</option>
            </select>
          </div>

          {/* Authentication Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Authentication</label>
              <input
                type="password"
                placeholder="Password (required)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Password is required for authentication.</p>
          </div>

          <button
            type="submit"
            disabled={processing || cryptoToMpesaLoading}
            className="w-full py-4 px-6 bg-[#0795B0] hover:bg-[#0684A0] text-white rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0795B0] disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
          >
            {processing || cryptoToMpesaLoading ? 'Processing…' : 'Send'}
          </button>
        </form>

        {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-red-400 font-semibold text-lg">Transaction Failed</h3>
                  <p className="text-red-300 text-sm">Please review the error details below</p>
                </div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-4 mb-4">
                <p className="text-red-300 text-sm font-medium mb-2">Error Details:</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors duration-200"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setPassword('');
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
        )}

        {result && (
            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-green-400 font-bold text-xl">Transaction Initiated Successfully!</h3>
                  <p className="text-green-300 text-sm">Your crypto is being converted to M-Pesa</p>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-900/30 rounded-lg p-4">
                  <h4 className="text-green-300 font-semibold mb-3 text-sm uppercase tracking-wide">Transaction Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-200">Transaction ID:</span>
                      <span className="text-green-100 font-mono">{result.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Status:</span>
                      <span className="text-green-100 capitalize">{result.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Created:</span>
                      <span className="text-green-100">{result.createdAt ? new Date(result.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Est. Completion:</span>
                      <span className="text-green-100">{result.estimatedCompletionTime ? new Date(result.estimatedCompletionTime).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">M-Pesa TX ID:</span>
                      <span className="text-green-100 font-mono text-xs">{result.mpesaTransactionId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-900/30 rounded-lg p-4">
                  <h4 className="text-green-300 font-semibold mb-3 text-sm uppercase tracking-wide">Amount Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-200">Crypto Amount:</span>
                      <span className="text-green-100">{result.cryptoAmount || result.amount} {result.transactionDetails?.tokenType || formData.tokenType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">M-Pesa Amount:</span>
                      <span className="text-green-100">KES {(result.amount || result.cryptoAmount * (rate || 130)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Exchange Rate:</span>
                      <span className="text-green-100">1 USD = {result.transactionDetails?.exchangeRate || (rate || 130)} KES</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Fees:</span>
                      <span className="text-green-100">
                        {result.transactionDetails?.fees?.amount || '0.00'} USD 
                        ({result.transactionDetails?.fees?.percentage || 0.5}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-green-900/30 rounded-lg p-4 mb-6">
                <h4 className="text-green-300 font-semibold mb-3 text-sm uppercase tracking-wide">Transaction Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-200">Type:</span>
                      <span className="text-green-100">{result.transactionDetails?.type || 'CRYPTO_TO_MPESA'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Chain:</span>
                      <span className="text-green-100 capitalize">{result.transactionDetails?.chain || formData.chain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Token:</span>
                      <span className="text-green-100">{result.transactionDetails?.tokenType || formData.tokenType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-200">Recipient:</span>
                      <span className="text-green-100">{result.transactionDetails?.recipientPhone || formData.recipientPhone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-200">M-Pesa TX ID:</span>
                      <span className="text-green-100 font-mono text-xs">{result.mpesaTransactionId || 'N/A'}</span>
                    </div>
                    {result.transactionDetails?.blockchainTransaction?.hash && (
                      <div className="flex justify-between">
                        <span className="text-green-200">Blockchain Hash:</span>
                        <span className="text-green-100 font-mono text-xs">
                          {result.transactionDetails.blockchainTransaction.hash.slice(0, 10)}...{result.transactionDetails.blockchainTransaction.hash.slice(-8)}
                        </span>
                      </div>
                    )}
                    {result.transactionDetails?.blockchainTransaction?.explorerUrl && (
                      <div className="flex justify-between">
                        <span className="text-green-200">Explorer:</span>
                        <span className="text-green-100 text-xs">
                          <a 
                            href={result.transactionDetails.blockchainTransaction.explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            View Transaction
                          </a>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction Status Tracking */}
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                <h4 className="text-blue-300 font-semibold mb-3 text-sm uppercase tracking-wide flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Transaction Status
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-blue-200 text-sm">Transaction initiated and crypto sent</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-blue-200 text-sm">Converting crypto to KES (2-5 minutes)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                    <span className="text-gray-400 text-sm">M-Pesa payment processing</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                    <span className="text-gray-400 text-sm">SMS confirmation sent to recipient</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
                  <p className="text-blue-200 text-xs text-center">
                    📱 You&apos;ll receive SMS updates on the transaction progress. 
                    Check your phone for M-Pesa notifications.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {result.transactionDetails?.blockchainTransaction?.explorerUrl && (
                  <a
                    href={result.transactionDetails.blockchainTransaction.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Explorer
                  </a>
                )}
                <button
                  onClick={() => {
                    setResult(null);
                    setFormData(prev => ({ ...prev, amount: '' }));
                    setPassword('');
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors duration-200"
                >
                  Send Another
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>

              {/* Status Message */}
              <div className="mt-4 p-3 bg-green-900/40 rounded-lg border border-green-400/30">
                <p className="text-green-200 text-sm text-center">
                  💬 {result.message || 'Your withdrawal is being processed. You&apos;ll receive an SMS confirmation shortly.'}
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
