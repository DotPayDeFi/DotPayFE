import { cryptoAPI } from './crypto';
import { businessFinanceAPI } from './business-finance-api';

// Error types for better categorization
export enum CryptoErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  BUSINESS_INSUFFICIENT_BALANCE = 'BUSINESS_INSUFFICIENT_BALANCE',
  PLATFORM_INSUFFICIENT_BALANCE = 'PLATFORM_INSUFFICIENT_BALANCE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GAS_ERROR = 'GAS_ERROR',
  USER_REJECTED = 'USER_REJECTED',
  EXECUTION_REVERTED = 'EXECUTION_REVERTED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  TRANSACTION_LIMIT_EXCEEDED = 'TRANSACTION_LIMIT_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error response interface
export interface CryptoErrorResponse {
  success: false;
  message: string;
  error: {
    code: CryptoErrorType;
    message: string;
    currentBalance?: {
      amount: number;
      token: string;
      chain: string;
    };
    timestamp: string;
    requestId: string;
    details?: any;
  };
}

// Error handler context interface
export interface ErrorHandlerContext {
  senderAddress?: string;
  businessAddress?: string;
  chain: string;
  tokenSymbol: string;
  amount: number;
  operation: string;
  businessName?: string;
}

// Utility functions
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const isInsufficientBalanceError = (error: any): boolean => {
  const errorMessage = error?.message || error?.response?.data?.message || '';
  const errorString = errorMessage.toLowerCase();
  
  return errorString.includes('transfer amount exceeds balance') ||
         errorString.includes('erc20: transfer amount exceeds balance') ||
         errorString.includes('insufficient funds') ||
         errorString.includes('insufficient balance') ||
         errorString.includes('balance too low') ||
         errorString.includes('not enough balance') ||
         errorString.includes('exceeds available balance');
};

const isNetworkError = (error: any): boolean => {
  return !error.response || 
         error.code === 'NETWORK_ERROR' ||
         error.code === 'ECONNABORTED' ||
         error.message?.includes('Network Error') ||
         error.message?.includes('timeout');
};

const isGasError = (error: any): boolean => {
  const errorMessage = error?.message || error?.response?.data?.message || '';
  return errorMessage.toLowerCase().includes('gas') ||
         errorMessage.toLowerCase().includes('gas limit') ||
         errorMessage.toLowerCase().includes('out of gas');
};

const isUserRejectedError = (error: any): boolean => {
  const errorMessage = error?.message || error?.response?.data?.message || '';
  return errorMessage.toLowerCase().includes('user rejected') ||
         errorMessage.toLowerCase().includes('user denied') ||
         errorMessage.toLowerCase().includes('rejected by user') ||
         error.code === 4001; // MetaMask user rejection code
};

const isExecutionRevertedError = (error: any): boolean => {
  const errorMessage = error?.message || error?.response?.data?.message || '';
  return errorMessage.toLowerCase().includes('execution reverted') ||
         errorMessage.toLowerCase().includes('revert') ||
         errorMessage.toLowerCase().includes('transaction failed');
};

// Fetch user balance
const fetchUserBalance = async (address: string, chain: string, tokenSymbol: string): Promise<{ amount: number; token: string; chain: string } | null> => {
  try {
    // Use chain-specific balance endpoint
    const balanceResponse = await cryptoAPI.getBalance();
    
    if (balanceResponse.success && balanceResponse.data?.balances) {
      // For chain-specific balance, the structure is different
      const tokenBalance = balanceResponse.data.balances[tokenSymbol as keyof typeof balanceResponse.data.balances];
      if (tokenBalance !== undefined) {
        return {
          amount: typeof tokenBalance === 'number' ? tokenBalance : 0,
          token: tokenSymbol,
          chain: chain
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch user balance:', error);
    return null;
  }
};

// Fetch business balance
const fetchBusinessBalance = async (businessId: string, chain: string, tokenSymbol: string): Promise<{ amount: number; token: string; chain: string } | null> => {
  try {
    const balanceResponse = await businessFinanceAPI.getBusinessBalance(businessId);
    
    if (balanceResponse.success && balanceResponse.data?.balances) {
      const chainBalance = balanceResponse.data.balances[chain as keyof typeof balanceResponse.data.balances];
      if (chainBalance && chainBalance[tokenSymbol as keyof typeof chainBalance]) {
        const tokenBalance = chainBalance[tokenSymbol as keyof typeof chainBalance] as any;
        return {
          amount: tokenBalance?.balance || 0,
          token: tokenSymbol,
          chain: chain
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch business balance:', error);
    return null;
  }
};

// Main CryptoErrorHandler class
export class CryptoErrorHandler {
  /**
   * Handle crypto errors for user transactions
   */
  static async handleCryptoError(
    error: any,
    res: any,
    context: ErrorHandlerContext
  ): Promise<CryptoErrorResponse> {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    
    // Check for insufficient balance
    if (isInsufficientBalanceError(error)) {
      const currentBalance = context.senderAddress 
        ? await fetchUserBalance(context.senderAddress, context.chain, context.tokenSymbol)
        : null;
      
      const balanceInfo = currentBalance 
        ? `You have ${currentBalance.amount} ${currentBalance.token} but tried to ${context.operation} ${context.amount} ${context.tokenSymbol}. Please reduce the amount or add more ${context.tokenSymbol} to your wallet.`
        : `Insufficient ${context.tokenSymbol} balance for ${context.operation}. Please check your wallet balance and try again.`;
      
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Transaction failed',
        error: {
          code: CryptoErrorType.INSUFFICIENT_BALANCE,
          message: `Insufficient ${context.tokenSymbol} balance for ${context.operation}. ${balanceInfo}`,
          currentBalance: currentBalance || undefined,
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            stack: error.stack,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(400).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Check for network errors
    if (isNetworkError(error)) {
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Transaction failed',
        error: {
          code: CryptoErrorType.NETWORK_ERROR,
          message: 'Network error occurred. Please check your internet connection and try again.',
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(500).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Check for gas errors
    if (isGasError(error)) {
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Transaction failed',
        error: {
          code: CryptoErrorType.GAS_ERROR,
          message: 'Gas estimation failed. Please try again or contact support if the issue persists.',
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(400).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Check for user rejection
    if (isUserRejectedError(error)) {
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Transaction cancelled',
        error: {
          code: CryptoErrorType.USER_REJECTED,
          message: 'Transaction was cancelled by user.',
          timestamp,
          requestId
        }
      };
      
      if (res) {
        res.status(400).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Check for execution reverted
    if (isExecutionRevertedError(error)) {
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Transaction failed',
        error: {
          code: CryptoErrorType.EXECUTION_REVERTED,
          message: 'Transaction execution failed. Please check your inputs and try again.',
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(400).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Authentication failed',
        error: {
          code: CryptoErrorType.AUTHENTICATION_FAILED,
          message: 'Authentication failed. Please check your credentials and try again.',
          timestamp,
          requestId
        }
      };
      
      if (res) {
        res.status(error.response.status).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Handle validation errors
    if (error.response?.status === 400) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Validation failed';
      
      let code = CryptoErrorType.UNKNOWN_ERROR;
      let message = errorMessage;
      
      switch (errorCode) {
        case 'INVALID_AMOUNT':
          code = CryptoErrorType.INVALID_AMOUNT;
          message = 'Invalid transaction amount. Please enter a valid amount.';
          break;
        case 'INVALID_RECIPIENT':
          code = CryptoErrorType.INVALID_RECIPIENT;
          message = 'Invalid recipient address. Please check and try again.';
          break;
        case 'TRANSACTION_LIMIT_EXCEEDED':
          code = CryptoErrorType.TRANSACTION_LIMIT_EXCEEDED;
          message = 'Transaction limit exceeded. Please try with a smaller amount.';
          break;
      }
      
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Transaction failed',
        error: {
          code,
          message,
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(400).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // Default error handling
    const errorResponse: CryptoErrorResponse = {
      success: false,
      message: 'Transaction failed',
      error: {
        code: CryptoErrorType.UNKNOWN_ERROR,
        message: error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.',
        timestamp,
        requestId,
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack,
          context
        } : undefined
      }
    };
    
    if (res) {
      res.status(500).json(errorResponse);
    }
    
    return errorResponse;
  }
  
  /**
   * Handle crypto errors for business transactions
   */
  static async handleBusinessCryptoError(
    error: any,
    res: any,
    context: ErrorHandlerContext
  ): Promise<CryptoErrorResponse> {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    
    // Check for insufficient balance
    if (isInsufficientBalanceError(error)) {
      const currentBalance = context.businessAddress && context.businessName
        ? await fetchBusinessBalance(context.businessAddress, context.chain, context.tokenSymbol)
        : null;
      
      const businessName = context.businessName ? ` (${context.businessName})` : '';
      const balanceInfo = currentBalance 
        ? `Business has ${currentBalance.amount} ${currentBalance.token} but tried to ${context.operation} ${context.amount} ${context.tokenSymbol}. Please add more ${context.tokenSymbol} to the business wallet or reduce the amount.`
        : `Insufficient ${context.tokenSymbol} balance in business wallet${businessName} for ${context.operation}. Please check the business wallet balance and try again.`;
      
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Business transaction failed',
        error: {
          code: CryptoErrorType.BUSINESS_INSUFFICIENT_BALANCE,
          message: `Insufficient ${context.tokenSymbol} balance in business wallet${businessName} for ${context.operation}. ${balanceInfo}`,
          currentBalance: currentBalance || undefined,
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            stack: error.stack,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(400).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // For other errors, use the standard crypto error handler
    return this.handleCryptoError(error, res, context);
  }
  
  /**
   * Handle crypto errors for platform wallet operations
   */
  static async handlePlatformWalletError(
    error: any,
    res: any,
    context: ErrorHandlerContext
  ): Promise<CryptoErrorResponse> {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    
    // Check for insufficient balance
    if (isInsufficientBalanceError(error)) {
      const errorResponse: CryptoErrorResponse = {
        success: false,
        message: 'Platform operation failed',
        error: {
          code: CryptoErrorType.PLATFORM_INSUFFICIENT_BALANCE,
          message: `Insufficient ${context.tokenSymbol} balance in platform wallet for ${context.operation}. Please contact support.`,
          timestamp,
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            stack: error.stack,
            context
          } : undefined
        }
      };
      
      if (res) {
        res.status(500).json(errorResponse);
      }
      
      return errorResponse;
    }
    
    // For other errors, use the standard crypto error handler
    return this.handleCryptoError(error, res, context);
  }
}

export default CryptoErrorHandler;
