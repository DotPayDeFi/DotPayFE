"use client";

import React, { useState } from 'react';
import { useMpesa } from '../../hooks/useMpesa';
import { useChain } from '../../context/ChainContext';
import { useGetConversionRate } from '@/hooks/apiHooks';

export const PayWithCryptoForm: React.FC = () => {
  const { payWithCrypto, payWithCryptoLoading } = useMpesa();
  const { chain } = useChain();
  const { data: rate, isLoading: rateLoading } = useGetConversionRate();
  
  const [formData, setFormData] = useState({
    amount: '', // KES or USD entered depending on mode
    targetType: 'paybill' as 'paybill' | 'till',
    targetNumber: '',
    accountNumber: '',
    chain: chain || 'polygon',
    tokenType: 'USDC',
    description: '',
  });
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');

  const [password, setPassword] = useState('');
  const [googleAuthCode, setGoogleAuthCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      if (!password.trim() && !googleAuthCode.trim()) {
        setError('Please enter your Password or Google Authenticator code');
        return;
      }

      if (!confirm) {
        setError('Please confirm the payment before proceeding');
        return;
      }

      // Compute fiat amount in KES for backend
      const fiatKES = currency === 'KES' 
        ? Number(formData.amount)
        : Math.round(Number(formData.amount) * (rate ?? 130));

      // Calculate crypto amount based on current rate
      const currentRate = rate ?? 130; // KES per USD
      const cryptoAmount = fiatKES / currentRate; // Convert KES to USD (since USDC ≈ USD)

      const payload = {
        amount: fiatKES,
        cryptoAmount: parseFloat(cryptoAmount.toFixed(6)), // Required field - auto-calculated
        targetType: formData.targetType,
        targetNumber: formData.targetNumber,
        ...(formData.targetType === 'paybill' && formData.accountNumber ? { accountNumber: formData.accountNumber } : {}),
        chain: formData.chain,
        tokenType: formData.tokenType,
        description: formData.description,
        // Only include authentication fields that have values
        ...(password ? { password } : {}),
        ...(googleAuthCode ? { googleAuthCode } : {}),
      };
      
      console.log('Submitting payWithCrypto payload:', payload);
      console.log('Form data:', formData);
      console.log('Currency:', currency);
      console.log('Rate:', rate);
      console.log('Fiat KES amount:', fiatKES);
      console.log('Crypto amount calculated:', cryptoAmount);
      console.log('Password provided:', password ? 'Yes' : 'No');
      console.log('Google Auth provided:', googleAuthCode ? 'Yes' : 'No');
      console.log('Payload keys:', Object.keys(payload));
      console.log('Payload values:', Object.values(payload));
      
      const response = await payWithCrypto(payload);
      
      if (response.success) {
        // Reset form
        setFormData({
          amount: '',
          targetType: 'paybill',
          targetNumber: '',
          accountNumber: '',
          chain: chain || 'polygon',
          tokenType: 'USDC',
          description: '',
        });
        setPassword('');
        setGoogleAuthCode('');
        
        // Show success with transaction details
        alert(`Payment successful! Transaction Hash: ${response.data.cryptoTransactionHash}`);
      }
    } catch (error) {
      console.error('Pay with crypto error:', error);
      
      // Extract error details for better debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          message: axiosError.response?.data?.message || axiosError.message
        });
        
        // Set user-friendly error message
        if (axiosError.response?.status === 400) {
          const errorMessage = axiosError.response?.data?.message || 'Invalid request data';
          const errorDetails = axiosError.response?.data?.error;
          setError(`Bad Request: ${errorMessage}${errorDetails ? ` (${JSON.stringify(errorDetails)})` : ''}`);
        } else if (axiosError.response?.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
        } else {
          setError(axiosError.response?.data?.message || axiosError.message || 'Payment failed');
        }
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Common paybill numbers for quick selection
  const commonPaybills = [
    { name: 'KPLC (Electricity)', number: '888880' },
    { name: 'Nairobi Water', number: '535353' },
    { name: 'DSTV', number: '820820' },
    { name: 'Safaricom Internet', number: '551500' },
  ];

  return (
    <div className="max-w-md mx-auto p-6 bg-[#0A0E0E] border border-[#0795B0] rounded-xl shadow-md text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">🚀 Pay with Crypto (M-Pesa)</h2>
      <p className="text-sm text-gray-300 mb-4 text-center">
        Pay paybills or tills using your crypto. Funds are sent via M-Pesa.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="targetType" className="block text-sm font-medium text-gray-300">
            Payment Type
          </label>
          <select
            id="targetType"
            name="targetType"
            value={formData.targetType}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
          >
            <option value="paybill">Paybill (Bills, Services)</option>
            <option value="till">Till (Shops, Restaurants)</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="targetNumber" className="block text-sm font-medium text-gray-300">
            {formData.targetType === 'paybill' ? 'Paybill Number' : 'Till Number'}
          </label>
          <input
            type="text"
            id="targetNumber"
            name="targetNumber"
            value={formData.targetNumber}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            placeholder={formData.targetType === 'paybill' ? '888880' : '508508'}
            required
          />
          
          {formData.targetType === 'paybill' && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Quick select:</p>
              <div className="flex flex-wrap gap-1">
                {commonPaybills.map((paybill) => (
                  <button
                    key={paybill.number}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, targetNumber: paybill.number }))}
                    className="text-xs px-2 py-1 bg-[#1A1E1E] border border-[#0795B0] hover:bg-black/40 rounded"
                  >
                    {paybill.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {formData.targetType === 'paybill' && (
          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-300">
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
              placeholder="Your account number"
              required
            />
          </div>
        )}
        
        {/* Amount with currency toggle KES/USD and live conversion */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
              Amount ({currency})
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Currency:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'KES' | 'USD')}
                className="px-2 py-1 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-sm"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            placeholder={currency === 'KES' ? '500' : '3.75'}
            step="0.01"
            min="0.01"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            {rateLoading ? 'Loading rate...' : `Rate: 1 USD = ${(rate ?? 130).toFixed(2)} KES`}
          </p>
          {formData.amount && (
            <p className="text-xs text-gray-400 mt-1">
              {currency === 'USD'
                ? `≈ ${(Number(formData.amount) * (rate ?? 130)).toFixed(2)} KES`
                : `≈ ${(Number(formData.amount) / (rate ?? 130)).toFixed(2)} USD`}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="cryptoAmount" className="block text-sm font-medium text-gray-300">
            Crypto Amount (auto-calculated)
          </label>
          <input
            type="text"
            id="cryptoAmount"
            name="cryptoAmount"
            disabled
            value={formData.amount ? (
              currency === 'USD'
                ? Number(formData.amount).toFixed(6)
                : (Number(formData.amount) / (rate ?? 130)).toFixed(6)
            ) : ''}
            className="mt-1 block w-full px-3 py-2 bg-[#0A0E0E] border border-[#0795B0] rounded-md text-gray-400"
            placeholder="Auto-calculated"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.amount ? 
              `${formData.amount} ${currency} = ${currency === 'USD' ? Number(formData.amount).toFixed(6) : (Number(formData.amount) / (rate ?? 130)).toFixed(6)} ${formData.tokenType}` :
              'We auto-convert your amount to crypto at the current rate.'
            }
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tokenType" className="block text-sm font-medium text-gray-300">
              Token
            </label>
            <select
              id="tokenType"
              name="tokenType"
              value={formData.tokenType}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="chain" className="block text-sm font-medium text-gray-300">
              Chain
            </label>
            <select
              id="chain"
              name="chain"
              value={formData.chain}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            >
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="ethereum">Ethereum</option>
              <option value="base">Base</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            placeholder="Electricity bill payment"
            rows={2}
            maxLength={100}
          />
        </div>

        {/* Confirm */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="confirm"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="w-4 h-4 text-[#0795B0] bg-[#1A1E1E] border-[#0795B0] rounded focus:ring-[#0795B0] focus:ring-2"
          />
          <label htmlFor="confirm" className="text-sm text-gray-300">
            I confirm that I want to pay this amount
          </label>
        </div>

        {/* Authentication */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Authentication</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <input
              type="password"
              placeholder="Password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            />
            <input
              type="text"
              placeholder="Google Auth Code (optional)"
              value={googleAuthCode}
              maxLength={6}
              onChange={(e) => setGoogleAuthCode(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0]"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Provide either password or Google Authenticator code.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded-md text-sm text-red-300">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={payWithCryptoLoading}
          className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-[#0795B0] hover:bg-[#0684A0] focus:outline-none focus:ring-2 focus:ring-[#0795B0] disabled:opacity-50"
        >
          {payWithCryptoLoading ? 'Processing Payment...' : '🚀 Pay with Crypto'}
        </button>
      </form>
      
      <div className="mt-4 p-3 bg-black/40 border border-[#0795B0] rounded-md">
        <p className="text-sm text-gray-300">
          🌟 Your crypto is converted and sent via M-Pesa. If the payment fails, funds are protected.
        </p>
      </div>
    </div>
  );
};