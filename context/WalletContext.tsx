"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthSession } from "./AuthSessionContext";
import toast from "react-hot-toast";
import {
  generateMockWallet,
  generateMockBalance,
  generateMockStellarWallet,
  generateMockTransactions,
  createMockResponse,
  simulateDelay,
  MockWalletDetails,
  MockBalanceData,
} from "../lib/mock-data";

// Re-export types for compatibility
export type WalletDetails = MockWalletDetails;
export type BalanceData = MockBalanceData;
export type StellarBalance = { asset: string; balance: string; usdValue: string };
export type SendTokenData = { to: string; amount: string; token: string; chain: string };
export type PayMerchantData = { merchantId: string; amount: string; token: string; chain: string; description?: string };
export type TransferEvent = { id: string; from: string; to: string; amount: string; token: string; chain: string; txHash: string; timestamp: string; status: 'pending' | 'confirmed' | 'failed'; type: 'send' | 'receive' | 'payment' };
export type DepositData = { amount: string; phoneNumber: string };
export type WithdrawData = { amount: string; phoneNumber: string; token?: string; chain?: string };
export type PayWithCryptoData = { merchantId: string; amount: string; token: string; chain: string };
export type LiquidityPosition = { id: string; tokenA: string; tokenB: string; amount: string; chain: string };
export type ProvideLiquidityData = { tokenA: string; tokenB: string; amountA: string; amountB: string; chain: string };
export type Transaction = { id: string; type: string; amount: string; token: string; chain: string; status: string; timestamp: string };

// Supported chains and tokens
export const SUPPORTED_CHAINS = [
  'celo', 'polygon', 'arbitrum', 'base', 'optimism', 'ethereum', 
  'bnb', 'avalanche', 'fantom', 'gnosis', 'scroll', 'moonbeam', 
  'fuse', 'aurora', 'lisk', 'somnia', 'stellar'
];

export const SUPPORTED_TOKENS = [
  'USDC', 'USDT', 'BTC', 'ETH', 'WETH', 'WBTC', 'DAI', 'CELO', 'XLM'
];

// Context Types
export interface WalletContextType {
  // Wallet State
  wallet: WalletDetails | null;
  balance: BalanceData | null;
  loading: boolean;
  refreshing: boolean;
  
  // Stellar Wallet State
  stellarWallet: {
    accountId: string;
    balances: StellarBalance[];
    isActive: boolean;
  } | null;
  hasStellarWallet: boolean;
  
  // Wallet Setup
  hasWallet: boolean;
  initializeWallet: () => Promise<void>;
  initializeStellarWallet: () => Promise<void>;
  
  // Core Wallet Operations
  refreshWallet: () => Promise<void>;
  refreshStellarWallet: () => Promise<void>;
  sendToken: (data: SendTokenData) => Promise<any>;
  payMerchant: (data: PayMerchantData) => Promise<any>;
  getTransferHistory: () => Promise<TransferEvent[]>;
  
  // M-Pesa Integration
  depositViaMpesa: (data: DepositData) => Promise<any>;
  withdrawToMpesa: (data: WithdrawData) => Promise<any>;
  payWithCrypto: (data: PayWithCryptoData) => Promise<any>;
  
  // Liquidity Operations
  provideLiquidity: (data: ProvideLiquidityData) => Promise<any>;
  getLiquidityPositions: () => Promise<LiquidityPosition[]>;
  
  // Transaction History
  getTransactionHistory: (filters?: any) => Promise<Transaction[]>;
  
  // Utility Functions
  formatBalance: (balance: string, decimals?: number) => string;
  formatUSD: (amount: string) => string;
  getTokenIcon: (token: string) => string;
  getChainIcon: (chain: string) => string;
}

// Create context
const WalletContext = createContext<WalletContextType | null>(null);

// Provider component
export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuthSession();
  const [wallet, setWallet] = useState<WalletDetails | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Stellar wallet state
  const [stellarWallet, setStellarWallet] = useState<{
    accountId: string;
    balances: StellarBalance[];
    isActive: boolean;
  } | null>(null);
  
  // Check if user has wallet setup
  const hasWallet = wallet?.walletAddress ? true : false;
  const hasStellarWallet = stellarWallet?.accountId ? true : false;

  // Refresh Stellar wallet data
  const refreshStellarWallet = async () => {
    if (!isLoggedIn) return;
    
    try {
      await simulateDelay(500);
      const mockStellarWallet = generateMockStellarWallet();
      setStellarWallet({
        accountId: mockStellarWallet.accountId,
        balances: mockStellarWallet.balances,
        isActive: mockStellarWallet.isActive,
      });
    } catch (error: any) {
      console.error('Failed to load Stellar wallet:', error);
    }
  };

  // Initialize wallet data when authenticated
  useEffect(() => {
    if (isLoggedIn) {
      refreshWallet();
      refreshStellarWallet();
    } else {
      setWallet(null);
      setStellarWallet(null);
    }
  }, [isLoggedIn]);

  // Refresh wallet data
  const refreshWallet = async () => {
    if (!isLoggedIn) return;
    
    try {
      setRefreshing(true);
      await simulateDelay(600);
      
      const mockWallet = generateMockWallet();
      const mockBalance = generateMockBalance("mock-address");
      
      setWallet(mockWallet);
      setBalance(mockBalance);
    } catch (error: any) {
      console.error('Failed to refresh wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize wallet for new users (especially Google users)
  const initializeWallet = async () => {
    if (!isLoggedIn) {
      throw new Error('User must be authenticated to initialize wallet');
    }
    
    try {
      setLoading(true);
      await simulateDelay(800);
      
      const mockWallet = generateMockWallet();
      const mockBalance = generateMockBalance("mock-address");
      
      setWallet(mockWallet);
      setBalance(mockBalance);
      toast.success('Wallet initialized successfully!');
    } catch (error: any) {
      console.error('Failed to initialize wallet:', error);
      toast.error('Failed to initialize wallet');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Initialize Stellar wallet for new users
  const initializeStellarWallet = async () => {
    if (!isLoggedIn) {
      throw new Error('User must be authenticated to initialize Stellar wallet');
    }
    
    try {
      setLoading(true);
      await simulateDelay(800);
      
      const mockStellarWallet = generateMockStellarWallet();
      setStellarWallet({
        accountId: mockStellarWallet.accountId,
        balances: mockStellarWallet.balances,
        isActive: mockStellarWallet.isActive,
      });
      toast.success('Stellar wallet created successfully!');
    } catch (error: any) {
      console.error('Failed to initialize Stellar wallet:', error);
      toast.error('Failed to create Stellar wallet');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send token to another wallet
  const sendToken = async (data: SendTokenData) => {
    try {
      setLoading(true);
      await simulateDelay(1000);
      
      const response = createMockResponse({
        txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        status: 'pending',
      }, 'Transaction sent successfully');
      
      toast.success('Transaction sent successfully');
      await refreshWallet();
      return response;
    } catch (error: any) {
      toast.error('Transaction failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Pay merchant with crypto
  const payMerchant = async (data: PayMerchantData) => {
    try {
      setLoading(true);
      await simulateDelay(1000);
      
      const response = createMockResponse({
        txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        status: 'pending',
      }, 'Payment sent successfully');
      
      toast.success('Payment sent successfully');
      await refreshWallet();
      return response;
    } catch (error: any) {
      toast.error('Payment failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get transfer history
  const getTransferHistory = async (): Promise<TransferEvent[]> => {
    try {
      await simulateDelay(500);
      const mockTransactions = generateMockTransactions(10);
      return mockTransactions.map(tx => ({
        id: tx.id,
        from: tx.from || '',
        to: tx.to || '',
        amount: tx.amount,
        token: tx.token,
        chain: tx.chain,
        txHash: tx.txHash || '',
        timestamp: tx.timestamp,
        status: tx.status as 'pending' | 'confirmed' | 'failed',
        type: tx.type as 'send' | 'receive' | 'payment',
      }));
    } catch (error: any) {
      console.error('Failed to get transfer history:', error);
      return [];
    }
  };

  // Deposit via M-Pesa
  const depositViaMpesa = async (data: DepositData) => {
    try {
      setLoading(true);
      await simulateDelay(1000);
      
      const response = createMockResponse({
        transactionId: `mpesa_${Date.now()}`,
        status: 'pending',
      }, 'Deposit initiated successfully');
      
      toast.success('Deposit initiated successfully');
      return response;
    } catch (error: any) {
      toast.error('Deposit failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Withdraw to M-Pesa
  const withdrawToMpesa = async (data: WithdrawData) => {
    try {
      setLoading(true);
      await simulateDelay(1000);
      
      const response = createMockResponse({
        transactionId: `mpesa_${Date.now()}`,
        status: 'pending',
      }, 'Withdrawal initiated successfully');
      
      toast.success('Withdrawal initiated successfully');
      await refreshWallet();
      return response;
    } catch (error: any) {
      toast.error('Withdrawal failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Pay with crypto (bills, etc.)
  const payWithCrypto = async (data: PayWithCryptoData) => {
    try {
      setLoading(true);
      await simulateDelay(1000);
      
      const response = createMockResponse({
        txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        status: 'pending',
      }, 'Payment sent successfully');
      
      toast.success('Payment sent successfully');
      await refreshWallet();
      return response;
    } catch (error: any) {
      toast.error('Payment failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Provide liquidity
  const provideLiquidity = async (data: ProvideLiquidityData) => {
    try {
      setLoading(true);
      await simulateDelay(1000);
      
      const response = createMockResponse({
        positionId: `pos_${Date.now()}`,
        status: 'active',
      }, 'Liquidity provided successfully');
      
      toast.success('Liquidity provided successfully');
      await refreshWallet();
      return response;
    } catch (error: any) {
      toast.error('Failed to provide liquidity');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get liquidity positions
  const getLiquidityPositions = async (): Promise<LiquidityPosition[]> => {
    try {
      await simulateDelay(500);
      return [
        {
          id: 'pos_1',
          tokenA: 'USDC',
          tokenB: 'USDT',
          amount: '1000.00',
          chain: 'arbitrum',
        },
      ];
    } catch (error: any) {
      console.error('Failed to get liquidity positions:', error);
      return [];
    }
  };

  // Get transaction history
  const getTransactionHistory = async (filters?: any): Promise<Transaction[]> => {
    try {
      await simulateDelay(500);
      return generateMockTransactions(20);
    } catch (error: any) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  };



  // Utility Functions
  const formatBalance = (balance: string, decimals: number = 4): string => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(decimals);
  };

  const formatUSD = (amount: string): string => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const getTokenIcon = (token: string): string => {
    // Return token icon URL or placeholder
    return `/icons/tokens/${token.toLowerCase()}.svg`;
  };

  const getChainIcon = (chain: string): string => {
    // Return chain icon URL or placeholder
    return `/icons/chains/${chain.toLowerCase()}.svg`;
  };

  const value: WalletContextType = {
    wallet,
    balance,
    loading,
    refreshing,
    stellarWallet,
    hasStellarWallet,
    hasWallet,
    refreshWallet,
    refreshStellarWallet,
    initializeWallet,
    initializeStellarWallet,
    sendToken,
    payMerchant,
    getTransferHistory,
    depositViaMpesa,
    withdrawToMpesa,
    payWithCrypto,
    provideLiquidity,
    getLiquidityPositions,
    getTransactionHistory,
    formatBalance,
    formatUSD,
    getTokenIcon,
    getChainIcon,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
