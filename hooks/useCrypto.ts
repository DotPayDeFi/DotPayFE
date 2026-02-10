import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { 
  cryptoAPI, 
  SendTokenData, 
  PayMerchantData,
  SendTokenResponse,
  PayMerchantResponse,
  ReceiveInfoResponse,
  BalanceResponse,
  validateRecipientIdentifier,
  isInsufficientTokenBalanceError
} from '../lib/crypto';

export const useCrypto = () => {
  // API hooks
  const sendTokenApi = useApi<SendTokenResponse>();
  const payMerchantApi = useApi<PayMerchantResponse>();
  const receiveInfoApi = useApi<ReceiveInfoResponse>();
  const balanceApi = useApi<BalanceResponse>();

  // State for form data
  const [sendFormData, setSendFormData] = useState({
    recipientIdentifier: '',
    amount: '',
    chain: 'arbitrum',
    tokenType: 'USDC',
  });

  const [payFormData, setPayFormData] = useState({
    merchantId: '',
    amount: '',
    chainName: 'arbitrum',
    tokenSymbol: 'USDC',
    confirm: false,
  });

  // Send crypto to any user
  const sendToken = useCallback(async (data: SendTokenData) => {
    // Validate recipient identifier
    if (!validateRecipientIdentifier(data.recipientIdentifier)) {
      throw new Error('Invalid recipient identifier. Please use a valid email, phone number, or wallet address.');
    }

    try {
      return await sendTokenApi.execute(
        () => cryptoAPI.sendToken(data),
        {
          showSuccessToast: false,
          showErrorToast: false,
        }
      );
    } catch (err: any) {
      if (isInsufficientTokenBalanceError(err)) {
        // Attach a friendly message and structured details for UI consumers
        const available = err?.response?.data?.error?.available;
        const token = err?.response?.data?.error?.token;
        const chain = err?.response?.data?.error?.chain;
        const friendlyMessage = err?.response?.data?.message || `Insufficient ${token} balance on ${chain}.`;

        const enriched = Object.assign(new Error(friendlyMessage), {
          code: 'INSUFFICIENT_TOKEN_BALANCE',
          available,
          token,
          chain,
          original: err,
        });
        throw enriched;
      }
      throw err;
    }
  }, [sendTokenApi]);

  // Pay merchant with crypto
  const payMerchant = useCallback(async (data: PayMerchantData) => {
    if (!data.confirm) {
      throw new Error('Please confirm the payment before proceeding.');
    }

    return payMerchantApi.execute(
      () => cryptoAPI.payMerchant(data),
      {
        showSuccessToast: true,
        successMessage: 'Payment to merchant completed successfully!',
      }
    );
  }, [payMerchantApi]);

  // Get receive information
  const getReceiveInfo = useCallback(async () => {
    return receiveInfoApi.execute(
      () => cryptoAPI.getReceiveInfo(),
      {
        showSuccessToast: false,
      }
    );
  }, [receiveInfoApi]);

  // Get user balance
  const getBalance = useCallback(async () => {
    return balanceApi.execute(
      () => cryptoAPI.getBalance(),
      {
        showSuccessToast: false,
      }
    );
  }, [balanceApi]);

  // Update send form data
  const updateSendForm = useCallback((field: string, value: string) => {
    setSendFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Update pay form data
  const updatePayForm = useCallback((field: string, value: string | boolean) => {
    setPayFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Reset forms
  const resetSendForm = useCallback(() => {
    setSendFormData({
      recipientIdentifier: '',
      amount: '',
      chain: 'arbitrum',
      tokenType: 'USDC', // Keep as tokenType for UI consistency
    });
  }, []);

  const resetPayForm = useCallback(() => {
    setPayFormData({
      merchantId: '',
      amount: '',
      chainName: 'arbitrum',
      tokenSymbol: 'USDC',
      confirm: false,
    });
  }, []);

  // Get current user's wallet address from API (same as receive page)
  const getCurrentUserAddress = useCallback(async () => {
    try {
      console.log('🔍 Fetching wallet address from API...');
      const response = await cryptoAPI.getReceiveInfo();
      
      if (response.success && response.data.walletAddress) {
        console.log('✅ Found wallet address from API:', response.data.walletAddress);
        return response.data.walletAddress;
      } else {
        console.log('❌ No wallet address in API response');
        return '';
      }
    } catch (error) {
      console.error('❌ Failed to fetch wallet address from API:', error);
      return '';
    }
  }, []);

  return {
    // API functions
    sendToken,
    payMerchant,
    getReceiveInfo,
    getBalance,
    
    // Form data
    sendFormData,
    payFormData,
    
    // Form actions
    updateSendForm,
    updatePayForm,
    resetSendForm,
    resetPayForm,
    
    // Loading states
    sendTokenLoading: sendTokenApi.loading,
    payMerchantLoading: payMerchantApi.loading,
    receiveInfoLoading: receiveInfoApi.loading,
    balanceLoading: balanceApi.loading,
    
    // Data
    sendTokenData: sendTokenApi.data,
    payMerchantData: payMerchantApi.data,
    receiveInfoData: receiveInfoApi.data,
    balanceData: balanceApi.data,
    
    // Errors
    sendTokenError: sendTokenApi.error,
    payMerchantError: payMerchantApi.error,
    receiveInfoError: receiveInfoApi.error,
    balanceError: balanceApi.error,
    
    // Utility
    getCurrentUserAddress,
  };
};