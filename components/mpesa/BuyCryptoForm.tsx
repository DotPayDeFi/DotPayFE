"use client";

import React, { useState, useEffect } from 'react';
import { useMpesa } from '../../hooks/useMpesa';
import { cryptoConverter, CryptoConversion } from '../../lib/crypto-converter';

export const BuyCryptoForm: React.FC = () => {
  const { buyCrypto, buyCryptoLoading } = useMpesa();
  
  const [formData, setFormData] = useState({
    fiatAmount: '', // Amount in KES/USD
    phone: '',
    chain: 'arbitrum',
    tokenType: 'USDC',
    currency: 'KES' as 'KES' | 'USD',
  });

  // Conversion state
  const [conversion, setConversion] = useState<CryptoConversion | null>(null);
  const [marketPrices, setMarketPrices] = useState<Record<string, { usd: number; kes: number }>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentRates, setCurrentRates] = useState<{ usd: number; kes: number } | null>(null);

  // Transaction result state
  const [transactionResult, setTransactionResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    status?: string;
  } | null>(null);

  // Check authentication status
  const [authStatus, setAuthStatus] = useState({
    hasToken: false,
    token: '',
    user: null as any,
  });

  useEffect(() => {
    const token = localStorage.getItem('dotpay_token');
    const user = localStorage.getItem('dotpay_user');
    
    setAuthStatus({
      hasToken: !!token,
      token: token || '',
      user: user ? JSON.parse(user) : null,
    });

    // Auto-fill phone number from user account
    if (user) {
      const userData = JSON.parse(user);
      setFormData(prev => ({
        ...prev,
        phone: userData.phoneNumber || '',
      }));
    }

    // Load market prices
    loadMarketPrices();
  }, []);

  // Load current market prices
  const loadMarketPrices = async () => {
    try {
      const prices = await cryptoConverter.getMarketPrices();
      setMarketPrices(prices);
      
      // Also get current conversion rates for display
      const rates = await cryptoConverter.getConversionRates();
      setCurrentRates(rates);
      console.log('Current rates loaded:', rates);
    } catch (error) {
      console.error('Failed to load market prices:', error);
    }
  };

  // Get current KES/USD rate for display
  const [currentRate, setCurrentRate] = useState<string>('Loading...');

  useEffect(() => {
    const loadRates = async () => {
      try {
        const rates = await cryptoConverter.getConversionRates();
        setCurrentRates(rates);
        const usdToKes = (1 / rates.kes).toFixed(2);
        setCurrentRate(`1 USD = ${usdToKes} KES`);
      } catch (error) {
        setCurrentRate('Rate unavailable');
      }
    };
    
    loadRates();
  }, []);

  // Update currentRates when backend rate changes
  useEffect(() => {
    if (currentRates) {
      setCurrentRates(currentRates);
    }
  }, [currentRates]);

  // Calculate conversion when amount or currency changes
  useEffect(() => {
    if (formData.fiatAmount && parseFloat(formData.fiatAmount) > 0) {
      calculateConversion();
    } else {
      setConversion(null);
    }
  }, [formData.fiatAmount, formData.currency, formData.tokenType]);

  const calculateConversion = async () => {
    if (!formData.fiatAmount || parseFloat(formData.fiatAmount) <= 0) return;
    
    setIsCalculating(true);
    try {
      const result = await cryptoConverter.convertFiatToCrypto(
        parseFloat(formData.fiatAmount),
        formData.currency,
        formData.tokenType
      );
      setConversion(result);
    } catch (error) {
      console.error('Conversion calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authStatus.hasToken) {
      alert('You must be logged in to buy crypto. Please login first.');
      return;
    }

    if (!conversion) {
      alert('Please enter a valid amount to calculate conversion.');
      return;
    }
    
    // Convert USD to KES if the user selected USD currency
    let amountInKes = parseFloat(formData.fiatAmount);
    if (formData.currency === 'USD') {
      // Get current conversion rates to convert USD to KES
      try {
        const rates = await cryptoConverter.getConversionRates();
        amountInKes = parseFloat(formData.fiatAmount) / rates.kes; // Convert USD to KES
        console.log(`Converting ${formData.fiatAmount} USD to ${amountInKes.toFixed(2)} KES`);
        console.log(`Conversion rate used: 1 USD = ${(1 / rates.kes).toFixed(2)} KES`);
      } catch (error) {
        console.error('Failed to get conversion rates:', error);
        alert('Failed to convert USD to KES. Please try again.');
        return;
      }
    } else {
      console.log(`Using KES amount directly: ${amountInKes} KES`);
    }
    
    // Log the data being sent
    const requestData = {
      amount: amountInKes, // Send amount in KES to backend
      phone: formData.phone,
      chain: formData.chain,
      tokenType: formData.tokenType,
      currency: formData.currency, // Send original currency for backend reference
    };
    
    console.log('Sending data to API:', requestData);
    console.log('Original amount:', formData.fiatAmount, formData.currency);
    console.log('Amount in KES:', amountInKes);
    console.log('Conversion details:', conversion);
    
    try {
      const response = await buyCrypto(requestData);
      
      if (response.success) {
        // Set transaction result
        setTransactionResult({
          success: true,
          message: response.message || 'Crypto purchase initiated successfully',
          data: response.data,
          status: response.data?.status || 'processing'
        });
        
        // Reset form
        setFormData({
          fiatAmount: '',
          phone: authStatus.user?.phoneNumber || '', // Keep phone number
          chain: 'arbitrum',
          tokenType: 'USDC',
          currency: 'KES',
        });
        setConversion(null);
      }
    } catch (error: any) {
      console.error('Buy crypto error:', error);
      console.error('Error response data:', error.response?.data);
      
      // Set error result
      setTransactionResult({
        success: false,
        message: error.response?.data?.message || error.message || 'An unexpected error occurred',
        data: error.response?.data,
        status: 'failed'
      });
    }
  };

  return (
    <div className="w-full">
      <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Buy Crypto with M-Pesa</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Rate Display */}
          <div className="p-3 bg-[#0A0E0E] border border-[#0795B0] rounded-md">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <p className="text-sm text-gray-300">
                  💱 <strong>Current Rate:</strong> {currentRate}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Rates update every 5 minutes
                </p>
              </div>
              <button
                onClick={async () => {
                  setCurrentRate('Refreshing...');
                  try {
                    // Refresh backend conversion rate
                    window.location.reload();
                  } catch (error) {
                    setCurrentRate('Rate unavailable');
                  }
                }}
                className="px-3 py-1 bg-[#0795B0] text-white text-xs rounded hover:bg-[#0684A0] transition-colors duration-200"
              >
                🔄 Refresh
              </button>
              <button
                onClick={async () => {
                  try {
                    await cryptoConverter.testConversion();
                  } catch (error) {
                    console.error('Test failed:', error);
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-200"
              >
                🧪 Test
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="fiatAmount" className="block text-sm font-medium text-gray-300 mb-2">
              Amount (KES/USD)
            </label>
            <div className="flex space-x-3">
              <input
                type="number"
                id="fiatAmount"
                name="fiatAmount"
                value={formData.fiatAmount}
                onChange={handleInputChange}
                className="flex-1 px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                placeholder="1000"
                step="0.01"
                min="0"
                required
              />
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter the amount you want to spend in KES or USD
            </p>
            {formData.currency === 'USD' && (
              <p className="text-xs text-yellow-400 mt-1">
                💡 Note: USD amounts will be converted to KES for M-Pesa payment
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              M-Pesa Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
              placeholder="+254712345678"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Auto-filled from your account: {formData.phone || 'Not set'}
            </p>
          </div>
          
          <div>
            <label htmlFor="tokenType" className="block text-sm font-medium text-gray-300 mb-2">
              Token Type
            </label>
            <select
              id="tokenType"
              name="tokenType"
              value={formData.tokenType}
              onChange={handleInputChange}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
            >
              <option value="USDC">USDC (USD Coin)</option>
              <option value="USDT">USDT (Tether)</option>
              <option value="XLM">XLM (Stellar Lumens)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="BTC">BTC (Bitcoin)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="chain" className="block text-sm font-medium text-gray-300 mb-2">
              Blockchain
            </label>
            <select
              id="chain"
              name="chain"
              value={formData.chain}
              onChange={handleInputChange}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
            >
              <option value="arbitrum">Arbitrum</option>
              <option value="celo">Celo</option>
              <option value="polygon">Polygon</option>
              <option value="base">Base</option>
              <option value="stellar">🌟 Stellar</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={buyCryptoLoading || isCalculating}
            className="w-full flex justify-center py-4 px-6 border border-transparent rounded-md shadow-lg text-lg font-semibold text-white bg-[#0795B0] hover:bg-[#0684A0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0795B0] disabled:opacity-50 transition-all duration-200 mt-8 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {buyCryptoLoading || isCalculating ? 'Processing...' : 'Buy Crypto'}
          </button>
        </form>

        {/* Conversion Display */}
        {isCalculating && (
          <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0795B0] mx-auto mb-3"></div>
            <p className="text-gray-300">Calculating conversion rates...</p>
          </div>
        )}

        {conversion && !isCalculating && (
          <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
            <h3 className="text-lg font-semibold text-white mb-4">💱 Conversion Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0A0E0E] border border-[#0795B0] rounded-md">
                <p className="text-sm text-gray-400 mb-1">You Pay</p>
                <p className="text-xl font-bold text-white">
                  {conversion.fiatAmount.toLocaleString()} {conversion.fiatCurrency}
                </p>
                {formData.currency === 'USD' && (
                  <p className="text-xs text-gray-400 mt-1">
                    ≈ {currentRates ? (conversion.fiatAmount / currentRates.kes).toFixed(0) : '...'} KES
                  </p>
                )}
              </div>
              <div className="p-4 bg-[#0A0E0E] border border-[#0795B0] rounded-md">
                <p className="text-sm text-gray-400 mb-1">You Receive</p>
                <p className="text-xl font-bold text-white">
                  {conversion.cryptoAmount.toFixed(6)} {conversion.cryptoToken}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[#0A0E0E] border border-[#0795B0] rounded-md">
              <p className="text-sm text-gray-400">
                💡 Rate: 1 {conversion.cryptoToken} = {conversion.conversionRate.toFixed(2)} USD
                {conversion.fiatCurrency === 'KES' && currentRates && ` (≈ ${(conversion.conversionRate / currentRates.kes).toFixed(0)} KES)`}
              </p>
              {formData.currency === 'USD' && (
                <p className="text-sm text-gray-400 mt-2">
                  ⚠️ M-Pesa will charge you in KES: ≈ {currentRates ? (conversion.fiatAmount / currentRates.kes).toFixed(0) : '...'} KES
                </p>
              )}
            </div>
          </div>
        )}

        {/* Market Prices */}
        {Object.keys(marketPrices).length > 0 && (
          <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Current Market Prices</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(marketPrices).map(([token, prices]) => (
                <div key={token} className="p-3 bg-[#0A0E0E] border border-[#0795B0] rounded-md text-center">
                  <p className="text-sm font-medium text-white mb-1">{token}</p>
                  <p className="text-xs text-gray-400">${prices.usd.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">KES{currentRates ? (prices.usd / currentRates.kes).toFixed(0) : prices.kes.toFixed(0)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <button
                onClick={loadMarketPrices}
                className="text-xs text-[#0795B0] hover:text-[#0684A0] transition-colors duration-200"
              >
                🔄 Refresh Rates
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
          <p className="text-sm text-gray-300">
            💡 You&apos;ll receive an M-Pesa prompt to complete the payment. 
            Your crypto will be automatically transferred to your wallet once payment is confirmed.
          </p>
        </div>

        {/* Transaction Result Cards */}
        {transactionResult && (
          <div className="mt-6">
            {transactionResult.success ? (
              <div className="p-6 bg-green-900/20 border border-green-500 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-400">Transaction Successful</h3>
                    <p className="text-sm text-green-300">{transactionResult.message}</p>
                  </div>
                </div>
                
                {transactionResult.data && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Transaction ID:</span>
                        <p className="text-white font-mono">{transactionResult.data.transactionId}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <p className="text-green-400 capitalize">{transactionResult.data.status}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <p className="text-white">{transactionResult.data.mpesaAmount} KES</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Crypto:</span>
                        <p className="text-white">{transactionResult.data.cryptoAmount} {transactionResult.data.tokenType}</p>
                      </div>
                    </div>
                    
                    {transactionResult.data.transactionDetails?.mpesaReceiptNumber && (
                      <div className="p-3 bg-green-900/30 border border-green-500/50 rounded">
                        <p className="text-sm text-green-300">
                          <strong>M-Pesa Receipt:</strong> {transactionResult.data.transactionDetails.mpesaReceiptNumber}
                        </p>
                      </div>
                    )}
                    
                    {transactionResult.data.note && (
                      <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded">
                        <p className="text-sm text-blue-300">{transactionResult.data.note}</p>
                      </div>
                    )}
                    
                    {transactionResult.data.estimatedCompletionTime && (
                      <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded">
                        <p className="text-sm text-yellow-300">
                          <strong>Estimated Completion:</strong> {new Date(transactionResult.data.estimatedCompletionTime).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => setTransactionResult(null)}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-xl">✗</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-400">Transaction Failed</h3>
                    <p className="text-sm text-red-300">{transactionResult.message}</p>
                  </div>
                </div>
                
                {transactionResult.data && (
                  <div className="space-y-3">
                    {transactionResult.data.transactionDetails?.mpesaResultDesc && (
                      <div className="p-3 bg-red-900/30 border border-red-500/50 rounded">
                        <p className="text-sm text-red-300">
                          <strong>Error Details:</strong> {transactionResult.data.transactionDetails.mpesaResultDesc}
                        </p>
                      </div>
                    )}
                    
                    {transactionResult.data.transactionId && (
                      <div className="p-3 bg-gray-900/30 border border-gray-500/50 rounded">
                        <p className="text-sm text-gray-300">
                          <strong>Transaction ID:</strong> {transactionResult.data.transactionId}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => setTransactionResult(null)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};