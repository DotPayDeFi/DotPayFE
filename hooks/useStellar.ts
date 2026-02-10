import { useState, useCallback, useEffect } from 'react';
import { useApi } from './useApi';
import {
  stellarWalletAPI,
  stellarPaymentAPI,
  stellarMpesaAPI,
  stellarUtils,
  StellarWalletResponse,
  StellarSendPaymentData,
  StellarSendPaymentResponse,
  StellarBalance,
  StellarTransaction,
  StellarMpesaDepositData,
  StellarMpesaWithdrawData,
  STELLAR_SUPPORTED_ASSETS,
} from '../lib/stellar';
import toast from 'react-hot-toast';

export interface UseStellarReturn {
  // Wallet State
  wallet: StellarWalletResponse['data'] | null;
  balances: StellarBalance[];
  loading: boolean;
  error: string | null;

  // Wallet Operations
  createWallet: () => Promise<void>;
  getWallet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  getSecretKey: () => Promise<string | null>;
  validateAddress: (address: string) => Promise<boolean>;

  // Balance Operations
  getBalance: (asset?: 'XLM' | 'USDC') => Promise<any>;
  getAllBalances: () => Promise<void>;
  getTotalUSDValue: () => number;

  // Payment Operations
  sendPayment: (data: StellarSendPaymentData) => Promise<StellarSendPaymentResponse | null>;
  getTransactionHistory: (limit?: number, cursor?: string) => Promise<StellarTransaction[]>;

  // M-Pesa Operations
  buyWithMpesa: (data: StellarMpesaDepositData) => Promise<any>;
  sellToMpesa: (data: StellarMpesaWithdrawData) => Promise<any>;
  getRates: () => Promise<any>;
  convertKESToAsset: (amountKES: number, asset: 'XLM' | 'USDC') => Promise<any>;
  convertAssetToKES: (amountAsset: string, asset: 'XLM' | 'USDC') => Promise<any>;

  // Transaction History
  transactions: StellarTransaction[];
  loadTransactions: () => Promise<void>;

  // Utility
  formatAddress: (address: string) => string;
  formatAmount: (amount: string | number, decimals?: number) => string;
  isValidAddress: (address: string) => boolean;
}

export const useStellar = (): UseStellarReturn => {
  // State
  const [wallet, setWallet] = useState<StellarWalletResponse['data'] | null>(null);
  const [balances, setBalances] = useState<StellarBalance[]>([]);
  const [transactions, setTransactions] = useState<StellarTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API hooks
  const walletApi = useApi<StellarWalletResponse>();
  const paymentApi = useApi<StellarSendPaymentResponse>();

  // ================================
  // WALLET OPERATIONS
  // ================================

  const createWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await stellarWalletAPI.createWallet();
      
      if (response.success) {
        setWallet(response.data);
        setBalances(response.data.balances);
        toast.success('Stellar wallet created successfully!');
      } else {
        throw new Error(response.message || 'Failed to create wallet');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create Stellar wallet';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await stellarWalletAPI.getWallet();
      
      if (response.success) {
        setWallet(response.data);
        setBalances(response.data.balances);
      } else {
        throw new Error(response.message || 'Failed to get wallet');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load Stellar wallet';
      setError(message);
      
      // Don't show toast for 404 errors (wallet doesn't exist yet)
      if (err.response?.status !== 404) {
        toast.error(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    await getWallet();
  }, [getWallet]);

  const getSecretKey = useCallback(async (): Promise<string | null> => {
    try {
      const response = await stellarWalletAPI.getSecretKey();
      
      if (response.success) {
        return response.data.secretKey;
      }
      return null;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to retrieve secret key';
      toast.error(message);
      return null;
    }
  }, []);

  const validateAddress = useCallback(async (address: string): Promise<boolean> => {
    try {
      const response = await stellarWalletAPI.validateAddress({ address });
      return response.success && response.data.valid;
    } catch (err) {
      return false;
    }
  }, []);

  // ================================
  // BALANCE OPERATIONS
  // ================================

  const getBalance = useCallback(async (asset?: 'XLM' | 'USDC') => {
    try {
      const response = await stellarWalletAPI.getBalance(asset);
      return response;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to get balance';
      toast.error(message);
      throw err;
    }
  }, []);

  const getAllBalances = useCallback(async () => {
    try {
      const response = await stellarWalletAPI.getAllBalances();
      
      if (response.success) {
        setBalances(response.data.balances);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to get balances';
      toast.error(message);
    }
  }, []);

  const getTotalUSDValue = useCallback((): number => {
    return balances.reduce((total, balance) => total + balance.usdValue, 0);
  }, [balances]);

  // ================================
  // PAYMENT OPERATIONS
  // ================================

  const sendPayment = useCallback(async (data: StellarSendPaymentData): Promise<StellarSendPaymentResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      // Validate recipient address
      const isValid = await validateAddress(data.toAccountId);
      if (!isValid) {
        throw new Error('Invalid Stellar address');
      }

      const response = await stellarPaymentAPI.sendPayment(data);
      
      if (response.success) {
        toast.success('Payment sent successfully!');
        // Refresh wallet after successful payment
        await refreshWallet();
        return response;
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to send payment';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [validateAddress, refreshWallet]);

  const getTransactionHistory = useCallback(async (limit: number = 10, cursor?: string): Promise<StellarTransaction[]> => {
    try {
      const response = await stellarPaymentAPI.getTransactionHistory(limit, cursor);
      
      if (response.success) {
        return response.data.transactions;
      }
      return [];
    } catch (err: any) {
      console.error('Failed to get transaction history:', err);
      return [];
    }
  }, []);

  // ================================
  // M-PESA OPERATIONS
  // ================================

  const buyWithMpesa = useCallback(async (data: StellarMpesaDepositData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await stellarMpesaAPI.deposit(data);
      
      if (response.success) {
        toast.success('M-Pesa STK Push initiated. Please complete payment on your phone.');
        return response;
      } else {
        throw new Error(response.message || 'Failed to initiate M-Pesa payment');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to buy crypto with M-Pesa';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sellToMpesa = useCallback(async (data: StellarMpesaWithdrawData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await stellarMpesaAPI.withdraw(data);
      
      if (response.success) {
        toast.success('Withdrawal initiated. You will receive M-Pesa shortly.');
        // Refresh wallet after successful withdrawal
        await refreshWallet();
        return response;
      } else {
        throw new Error(response.message || 'Failed to withdraw to M-Pesa');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to withdraw to M-Pesa';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshWallet]);

  const getRates = useCallback(async () => {
    try {
      const response = await stellarMpesaAPI.getRates();
      return response;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to get exchange rates';
      toast.error(message);
      throw err;
    }
  }, []);

  const convertKESToAsset = useCallback(async (amountKES: number, asset: 'XLM' | 'USDC') => {
    try {
      const response = await stellarMpesaAPI.convertKESToAsset({ amountKES, asset });
      return response;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to convert KES to asset';
      toast.error(message);
      throw err;
    }
  }, []);

  const convertAssetToKES = useCallback(async (amountAsset: string, asset: 'XLM' | 'USDC') => {
    try {
      const response = await stellarMpesaAPI.convertAssetToKES({ amountAsset, asset });
      return response;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to convert asset to KES';
      toast.error(message);
      throw err;
    }
  }, []);

  // ================================
  // TRANSACTION HISTORY
  // ================================

  const loadTransactions = useCallback(async () => {
    try {
      const txs = await getTransactionHistory(20);
      setTransactions(txs);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    }
  }, [getTransactionHistory]);

  // ================================
  // AUTO-LOAD WALLET ON MOUNT
  // ================================

  useEffect(() => {
    // Try to load wallet automatically
    getWallet().catch(() => {
      // Wallet doesn't exist yet, that's okay
    });
  }, []);

  // ================================
  // RETURN API
  // ================================

  return {
    // State
    wallet,
    balances,
    loading,
    error,

    // Wallet Operations
    createWallet,
    getWallet,
    refreshWallet,
    getSecretKey,
    validateAddress,

    // Balance Operations
    getBalance,
    getAllBalances,
    getTotalUSDValue,

    // Payment Operations
    sendPayment,
    getTransactionHistory,

    // M-Pesa Operations
    buyWithMpesa,
    sellToMpesa,
    getRates,
    convertKESToAsset,
    convertAssetToKES,

    // Transaction History
    transactions,
    loadTransactions,

    // Utility Functions
    formatAddress: stellarUtils.formatAddress,
    formatAmount: stellarUtils.formatAmount,
    isValidAddress: stellarUtils.isValidStellarAddress,
  };
};

export default useStellar;


