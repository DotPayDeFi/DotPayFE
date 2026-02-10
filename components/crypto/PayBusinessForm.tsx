"use client";

import React, { useState } from 'react';
import { useCrypto } from '../../hooks/useCrypto';
import { SUPPORTED_CHAINS, SUPPORTED_TOKENS } from '../../lib/crypto';
import { useBusiness } from '@/context/BusinessContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Wallet, CreditCard, AlertCircle } from 'lucide-react';

interface BusinessQRData {
  type: 'business_payment';
  businessName: string;
  merchantId: string;
  walletAddress: string;
  businessType: string;
  phoneNumber: string;
  timestamp: string;
}

interface PayBusinessFormProps {
  qrData?: BusinessQRData;
  onSuccess?: () => void;
}

export const PayBusinessForm: React.FC<PayBusinessFormProps> = ({ 
  qrData, 
  onSuccess 
}) => {
  const {
    payMerchant,
    payFormData,
    updatePayForm,
    resetPayForm,
    payMerchantLoading,
    payMerchantData,
    payMerchantError,
    getCurrentUserAddress,
  } = useCrypto();

  const { toast } = useToast();
  const [validationError, setValidationError] = useState<string>('');
  const [googleAuthCode, setGoogleAuthCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Get current user's wallet address
  const currentUserAddress = getCurrentUserAddress();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!qrData) {
      setValidationError('No business QR code data found');
      return;
    }

    // Validate amount
    if (!payFormData.amount || parseFloat(payFormData.amount) <= 0) {
      setValidationError('Please enter a valid amount');
      return;
    }

    // Validate confirmation
    if (!payFormData.confirm) {
      setValidationError('Please confirm the payment before proceeding');
      return;
    }

    // Validate authentication (password or Google code)
    if (!googleAuthCode.trim() && !password.trim()) {
      setValidationError('Please enter your Password or Google Authenticator code');
      return;
    }

    try {
      // Await the current user address
      const userAddress = await currentUserAddress;
      
      const response = await payMerchant({
        senderAddress: userAddress,
        merchantId: qrData.merchantId, // Use merchant ID from QR code
        amount: parseFloat(payFormData.amount),
        confirm: payFormData.confirm,
        chainName: payFormData.chainName,
        tokenSymbol: payFormData.tokenSymbol,
        ...(googleAuthCode ? { googleAuthCode } : {}),
        ...(password ? { password } : {}),
      });

      if (response.success) {
        toast({
          title: "Payment Successful!",
          description: `Payment sent to ${qrData.businessName}`,
        });
        
        // Reset form on success
        resetPayForm();
        setGoogleAuthCode('');
        setPassword('');
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      setValidationError(error.message || 'Failed to pay business');
    }
  };

  if (!qrData) {
    return (
      <div className="w-full">
        <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Business QR Code</h2>
            <p className="text-gray-400">
              Please scan a business QR code to make a payment
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-1 text-center text-white">Pay Business</h2>
        <p className="text-center text-gray-400 mb-6">Send crypto payment to a business</p>
        
        {/* Business Info Display */}
        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="h-5 w-5 text-[#0795B0]" />
            <h3 className="text-lg font-semibold text-white">{qrData.businessName}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Merchant ID:</span>
              <span className="text-white font-mono">{qrData.merchantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Business Type:</span>
              <span className="text-white capitalize">{qrData.businessType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Phone:</span>
              <span className="text-white">{qrData.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Wallet Address:</span>
              <span className="text-white font-mono text-xs">
                {qrData.walletAddress.slice(0, 10)}...{qrData.walletAddress.slice(-8)}
              </span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
              Amount (in Crypto)
            </label>
            <input
              type="number"
              id="amount"
              value={payFormData.amount}
              onChange={(e) => updatePayForm('amount', e.target.value)}
              placeholder="0.00"
              step="0.000001"
              min="0"
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
              required
            />
          </div>

          {/* Token Selection */}
          <div>
            <label htmlFor="tokenSymbol" className="block text-sm font-medium text-gray-300 mb-2">
              Token
            </label>
            <select
              id="tokenSymbol"
              value={payFormData.tokenSymbol}
              onChange={(e) => updatePayForm('tokenSymbol', e.target.value)}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
            >
              {SUPPORTED_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chain Selection */}
          <div>
            <label htmlFor="chainName" className="block text-sm font-medium text-gray-300 mb-2">
              Blockchain
            </label>
            <select
              id="chainName"
              value={payFormData.chainName}
              onChange={(e) => updatePayForm('chainName', e.target.value)}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
            >
              {SUPPORTED_CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="confirm"
              checked={payFormData.confirm}
              onChange={(e) => updatePayForm('confirm', e.target.checked)}
              className="w-4 h-4 text-[#0795B0] bg-[#1A1E1E] border-[#0795B0] rounded focus:ring-[#0795B0] focus:ring-2"
              required
            />
            <label htmlFor="confirm" className="text-sm text-gray-300">
              I confirm that I want to pay this amount to {qrData.businessName}
            </label>
          </div>

          {/* Authentication */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Authentication</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="password"
                placeholder="Password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
              />
              <input
                type="text"
                id="googleAuthCode"
                value={googleAuthCode}
                onChange={(e) => setGoogleAuthCode(e.target.value)}
                placeholder="Google Auth Code (optional)"
                maxLength={6}
                className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Provide either password or Google Auth code.</p>
          </div>

          {/* Error Display */}
          {(validationError || payMerchantError) && (
            <div className="p-3 bg-red-900/20 border border-red-500 rounded-md">
              <p className="text-red-300 text-sm">
                {validationError || payMerchantError || 'An error occurred'}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={payMerchantLoading || !payFormData.confirm || (!googleAuthCode.trim() && !password.trim())}
            className="w-full flex justify-center py-4 px-6 border border-transparent rounded-md shadow-lg text-lg font-semibold text-white bg-[#0795B0] hover:bg-[#0684A0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0795B0] disabled:opacity-50 transition-all duration-200 mt-8 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {payMerchantLoading ? 'Processing...' : `Pay ${qrData.businessName}`}
          </button>
        </form>

        {/* Success Display */}
        {payMerchantData && (
          <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
            <h3 className="text-lg font-semibold text-white mb-4">✅ Payment Successful!</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p><strong>Business Name:</strong> {payMerchantData.data.businessName}</p>
              <p><strong>Transaction Hash:</strong> {payMerchantData.data.transactionHash}</p>
              <p><strong>Authentication Method:</strong> {payMerchantData.data.authenticationMethod}</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
          <p className="text-sm text-gray-300">
            💡 This payment will be sent directly to the business wallet address on the blockchain.
            The business will receive the payment immediately once the transaction is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
};
