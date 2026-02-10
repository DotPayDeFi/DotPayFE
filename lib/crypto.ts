/**
 * Crypto API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All crypto functions return mock data.
 */

import { createMockResponse, simulateDelay } from './mock-data';

export type SendTokenData = { recipientIdentifier: string; amount: number; senderAddress: string; chain: string; tokenSymbol?: string; password?: string; googleAuthCode?: string };
export type PayMerchantData = { senderAddress: string; merchantId: string; amount: number; confirm: boolean; chainName: string; tokenSymbol: string; googleAuthCode?: string };
export type SendTokenResponse = { success: boolean; message: string; data: any };
export type PayMerchantResponse = { success: boolean; message: string; data: any };

export const cryptoAPI = {
  sendToken: async (data: SendTokenData): Promise<SendTokenResponse> => {
    await simulateDelay(1000);
    return createMockResponse({
      transactionCode: `tx_${Date.now()}`,
      transactionHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      explorerUrl: '#',
      amount: data.amount.toString(),
      tokenSymbol: data.tokenSymbol || 'USDC',
      chain: data.chain,
    }, 'Token sent successfully');
  },
  payMerchant: async (data: PayMerchantData): Promise<PayMerchantResponse> => {
    await simulateDelay(1000);
    return createMockResponse({
      transactionCode: `tx_${Date.now()}`,
      transactionHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      explorerUrl: '#',
      amount: data.amount.toString(),
      tokenSymbol: data.tokenSymbol,
      chain: data.chainName,
    }, 'Payment sent successfully');
  },
};

// Validation utilities (keep for UI compatibility)
export const isValidAddress = (address: string): boolean => {
  if (!address) return false;
  // Stellar address (starts with G)
  if (address.startsWith('G') && address.length === 56) return true;
  // EVM address (starts with 0x, 42 chars)
  if (address.startsWith('0x') && address.length === 42) return true;
  return false;
};

export const isValidStellarAddress = (address: string): boolean => {
  return address.startsWith('G') && address.length === 56;
};

export const isValidEVMAddress = (address: string): boolean => {
  return address.startsWith('0x') && address.length === 42;
};

// Supported tokens with symbol and name
export const SUPPORTED_TOKENS = [
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'WETH', name: 'Wrapped Ethereum' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  { symbol: 'DAI', name: 'Dai Stablecoin' },
  { symbol: 'CELO', name: 'Celo' },
  { symbol: 'XLM', name: 'Stellar' },
] as const;

// Supported chains with id and name
export const SUPPORTED_CHAINS = [
  { id: 'celo', name: 'Celo' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'base', name: 'Base' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'bnb', name: 'BNB Chain' },
  { id: 'avalanche', name: 'Avalanche' },
  { id: 'fantom', name: 'Fantom' },
  { id: 'gnosis', name: 'Gnosis' },
  { id: 'scroll', name: 'Scroll' },
  { id: 'moonbeam', name: 'Moonbeam' },
  { id: 'fuse', name: 'Fuse' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'lisk', name: 'Lisk' },
  { id: 'somnia', name: 'Somnia' },
  { id: 'stellar', name: 'Stellar' },
] as const;

// Validation function for recipient identifier
export const validateRecipientIdentifier = (identifier: string): boolean => {
  if (!identifier) return false;
  
  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(identifier)) return true;
  
  // Check if it's a phone number (basic check)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (phoneRegex.test(identifier.replace(/\s/g, ''))) return true;
  
  // Check if it's a wallet address (EVM or Stellar)
  if (isValidAddress(identifier)) return true;
  
  return false;
};
