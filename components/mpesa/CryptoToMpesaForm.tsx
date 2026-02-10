"use client";

import React, { useState } from 'react';
import { useMpesa } from '../../hooks/useMpesa';
import { useChain } from '../../context/ChainContext';
import { useGetConversionRate } from '@/hooks/apiHooks';

export const CryptoToMpesaForm: React.FC = () => {
  const { cryptoToMpesa, cryptoToMpesaLoading } = useMpesa();
  const { chain } = useChain();
  const { data: rate, isLoading: rateLoading } = useGetConversionRate();
  
  const [formData, setFormData] = useState({
    amount: '', // Amount in KES or USD
    recipientPhone: '',
    chain: chain || 'polygon',
    tokenType: 'USDC',
    description: '',
  });
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');

  const [password, setPassword] = useState('');
  const [googleAuthCode, setGoogleAuthCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [failure, setFailure] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      setResult(null);
      setFailure(null);
      setProcessing(true);
      
      if (!password.trim() && !googleAuthCode.trim()) {
        setError('Please enter your Password or Google Authenticator code');
        setProcessing(false);
        return;
      }

      if (!confirm) {
        setError('Please confirm the transaction before proceeding');
        setProcessing(false);
        return;
      }

      // Calculate crypto amount based on fiat amount and conversion rate
      const kesPerUsd = rate ?? 130;
      const fiatAmount = parseFloat(formData.amount);
      
      if (isNaN(fiatAmount) || fiatAmount <= 0) {
        setError('Please enter a valid amount');
        setProcessing(false);
        return;
      }

      // Convert fiat amount to crypto amount
      const cryptoAmount = currency === 'USD' 
        ? fiatAmount 
        : fiatAmount / kesPerUsd;

      const payload = {
        amount: parseFloat(cryptoAmount.toFixed(6)),
        phone: formData.recipientPhone,
        tokenType: formData.tokenType,
        chain: formData.chain,
        password: password,
      };

      console.log('Submitting crypto-to-mpesa payload:', payload);

      const response = await cryptoToMpesa(payload);
      
      if (response.success) {
        setResult(response.data);
        // Reset form
        setFormData({
          amount: '',
          recipientPhone: '',
          chain: chain || 'polygon',
          tokenType: 'USDC',
          description: '',
        });
        setPassword('');
        setGoogleAuthCode('');
      } else {
        setFailure({ message: response.message, error: (response as any).error, data: response.data });
      }
    } catch (error) {
      console.error('Crypto to M-Pesa error:', error);
      setFailure({ message: 'Transaction failed', error });
    } finally {
      setProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-[#0A0E0E] border border-[#0795B0] rounded-lg">
      <h2 className="text-xl font-bold text-white mb-6">Send Crypto, Recipient Gets M-Pesa</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
            Amount
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'KES' | 'USD')}
              className="px-3 py-2 bg-[#1A1E1E] border border-l-0 border-[#0795B0] rounded-r-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            >
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {rate && (
            <p className="text-xs text-gray-400 mt-1">
              Current rate: 1 USD = {rate.toFixed(2)} KES
            </p>
          )}
        </div>

        {/* Recipient Phone */}
        <div>
          <label htmlFor="recipientPhone" className="block text-sm font-medium text-gray-300">
            Recipient Phone Number
          </label>
          <input
            type="tel"
            id="recipientPhone"
            name="recipientPhone"
            value={formData.recipientPhone}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            placeholder="254712345678"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Enter phone number with country code (254 for Kenya)</p>
        </div>

        {/* Chain Selection */}
        <div>
          <label htmlFor="chain" className="block text-sm font-medium text-gray-300">
            Blockchain
          </label>
          <select
            id="chain"
            name="chain"
            value={formData.chain}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
          >
            <option value="arbitrum">Arbitrum</option>
            <option value="polygon">Polygon</option>
            <option value="base">Base</option>
            <option value="optimism">Optimism</option>
            <option value="celo">Celo</option>
            <option value="scroll">Scroll</option>
            <option value="fuse">Fuse</option>
            <option value="gnosis">Gnosis</option>
            <option value="aurora">Aurora</option>
          </select>
        </div>

        {/* Token Selection */}
        <div>
          <label htmlFor="tokenType" className="block text-sm font-medium text-gray-300">
            Token
          </label>
          <select
            id="tokenType"
            name="tokenType"
            value={formData.tokenType}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="DAI">DAI</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            placeholder="Payment for services"
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
            I confirm that I want to send this amount
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
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            />
            <input
              type="text"
              placeholder="Google Auth Code (optional)"
              value={googleAuthCode}
              maxLength={6}
              onChange={(e) => setGoogleAuthCode(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
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
          disabled={cryptoToMpesaLoading || processing}
          className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-[#0795B0] hover:bg-[#0684A0] focus:outline-none focus:ring-2 focus:ring-[#0795B0] disabled:opacity-50"
        >
          {cryptoToMpesaLoading || processing ? 'Processing…' : '🚀 Send Crypto'}
        </button>
      </form>
      
      <div className="mt-4 p-3 bg-black/40 border border-[#0795B0] rounded-md">
        <p className="text-sm text-gray-300">
          🌟 Your crypto is converted to KES and sent via M-Pesa to the recipient&apos;s phone.
        </p>
      </div>

      {/* Success Card */}
      {result && (
        <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
          <h3 className="text-lg font-semibold text-white mb-2">✅ Transaction Initiated</h3>
          <p className="text-gray-300 mb-4">Your crypto has been sent and M-Pesa payment is being processed.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
            <div><span className="text-gray-400">Transaction ID:</span> {result.transactionId}</div>
            <div><span className="text-gray-400">Status:</span> {result.status}</div>
            <div><span className="text-gray-400">Estimated M-Pesa Amount:</span> {result.estimatedMpesaAmount?.toFixed(2)} KES</div>
            <div><span className="text-gray-400">Exchange Rate:</span> {result.exchangeRate?.toFixed(2)}</div>
            <div><span className="text-gray-400">Chain:</span> {formData.chain}</div>
            <div><span className="text-gray-400">Token:</span> {formData.tokenType}</div>
          </div>
          {result.estimatedCompletion && (
            <p className="text-sm text-gray-400 mt-2">Estimated completion: {result.estimatedCompletion}</p>
          )}
        </div>
      )}

      {/* Failure Card */}
      {failure && (
        <div className="mt-6 p-6 bg-red-900/20 border border-red-500 rounded-md">
          <h3 className="text-lg font-semibold text-red-200 mb-2">❌ Transaction Failed</h3>
          <p className="text-red-200 mb-2">{failure.message}</p>
          {failure.error?.code && (
            <p className="text-sm text-red-300 mb-2">Code: {failure.error.code}</p>
          )}
          {failure.error?.message && (
            <p className="text-sm text-red-300 mb-2">Error: {failure.error.message}</p>
          )}
          {failure.data?.transactionId && (
            <p className="text-sm text-red-300 mb-2">Transaction ID: {failure.data.transactionId}</p>
          )}
        </div>
      )}
    </div>
  );
};
