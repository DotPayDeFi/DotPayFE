import { useState, useCallback } from 'react';
import { 
  businessFinanceAPI,
  BusinessBalance,
  ChainSpecificBalance,
  BusinessTransactionHistory,
  WithdrawToPersonalRequest,
  WithdrawToPersonalResponse,
  WithdrawToMpesaRequest,
  WithdrawToMpesaResponse,
  BusinessCreditScore,
  LoanApplicationRequest,
  LoanApplicationResponse
} from '@/lib/business-finance-api';

export const useBusinessFinance = () => {
  // State for business balance
  const [businessBalance, setBusinessBalance] = useState<BusinessBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // State for chain-specific balance
  const [chainBalance, setChainBalance] = useState<ChainSpecificBalance | null>(null);
  const [chainBalanceLoading, setChainBalanceLoading] = useState(false);
  const [chainBalanceError, setChainBalanceError] = useState<string | null>(null);

  // State for business transactions
  const [businessTransactions, setBusinessTransactions] = useState<BusinessTransactionHistory | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // State for withdrawals
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  // State for credit score
  const [creditScore, setCreditScore] = useState<BusinessCreditScore | null>(null);
  const [creditScoreLoading, setCreditScoreLoading] = useState(false);
  const [creditScoreError, setCreditScoreError] = useState<string | null>(null);

  // State for loan applications
  const [loanApplication, setLoanApplication] = useState<LoanApplicationResponse | null>(null);
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);

  // Get business balance
  const getBusinessBalance = useCallback(async (businessId: string) => {
    console.log('🔄 useBusinessFinance: Getting business balance for:', businessId);
    setBalanceLoading(true);
    setBalanceError(null);
    
    try {
      const response = await businessFinanceAPI.getBusinessBalance(businessId);
      console.log('🔄 useBusinessFinance: API response:', response);
      
      if (response.success && response.data) {
        console.log('✅ useBusinessFinance: Setting business balance:', response.data);
        setBusinessBalance(response.data);
        return response.data;
      } else {
        console.log('❌ useBusinessFinance: API returned error:', response.error);
        setBalanceError(response.error || 'Failed to load business balance');
        return null;
      }
    } catch (error: any) {
      console.error('❌ useBusinessFinance: Exception caught:', error);
      const errorMessage = error.message || 'Failed to load business balance';
      setBalanceError(errorMessage);
      return null;
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Get business balance for specific chain
  const getBusinessBalanceByChain = useCallback(async (businessId: string, chain: string) => {
    setChainBalanceLoading(true);
    setChainBalanceError(null);
    
    try {
      console.log('🔄 useBusinessFinance: Getting business balance for chain:', chain, 'businessId:', businessId);
      const response = await businessFinanceAPI.getBusinessBalanceByChain(businessId, chain);
      console.log('🔄 useBusinessFinance: API response:', response);
      
      if (response.success && response.data) {
        console.log('✅ useBusinessFinance: Chain balance loaded successfully');
        setChainBalance(response.data);
        return response.data;
      } else {
        console.log('❌ useBusinessFinance: API returned error:', response.error);
        setChainBalanceError(response.error || 'Failed to load chain balance');
        return null;
      }
    } catch (error: any) {
      console.error('❌ useBusinessFinance: Exception caught:', error);
      const errorMessage = error.message || 'Failed to load chain balance';
      setChainBalanceError(errorMessage);
      return null;
    } finally {
      setChainBalanceLoading(false);
    }
  }, []);

  // Get business transaction history
  const getBusinessTransactionHistory = useCallback(async (
    businessId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ) => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    
    try {
      const response = await businessFinanceAPI.getBusinessTransactionHistory(businessId, options);
      
      if (response.success && response.data) {
        setBusinessTransactions(response.data);
        return response.data;
      } else {
        setTransactionsError(response.error || 'Failed to load business transactions');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load business transactions';
      setTransactionsError(errorMessage);
      return null;
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Withdraw to personal account
  const withdrawToPersonal = useCallback(async (request: WithdrawToPersonalRequest) => {
    setWithdrawalLoading(true);
    setWithdrawalError(null);
    
    try {
      const response = await businessFinanceAPI.withdrawToPersonal(request);
      
      if (response.success && response.data) {
        // Refresh balance after successful withdrawal
        if (request.businessId) {
          await getBusinessBalance(request.businessId);
        }
        return response.data;
      } else {
        setWithdrawalError(response.error || 'Failed to withdraw to personal account');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to withdraw to personal account';
      setWithdrawalError(errorMessage);
      return null;
    } finally {
      setWithdrawalLoading(false);
    }
  }, [getBusinessBalance]);

  // Withdraw to MPESA
  const withdrawToMpesa = useCallback(async (request: WithdrawToMpesaRequest) => {
    setWithdrawalLoading(true);
    setWithdrawalError(null);
    
    try {
      const response = await businessFinanceAPI.withdrawToMpesa(request);
      
      if (response.success && response.data) {
        // Refresh balance after successful withdrawal
        if (request.businessId) {
          await getBusinessBalance(request.businessId);
        }
        return response.data;
      } else {
        setWithdrawalError(response.error || 'Failed to withdraw to MPESA');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to withdraw to MPESA';
      setWithdrawalError(errorMessage);
      return null;
    } finally {
      setWithdrawalLoading(false);
    }
  }, [getBusinessBalance]);

  // Get business credit score
  const getBusinessCreditScore = useCallback(async (businessId: string) => {
    setCreditScoreLoading(true);
    setCreditScoreError(null);
    
    try {
      const response = await businessFinanceAPI.getBusinessCreditScore(businessId);
      
      if (response.success && response.data) {
        setCreditScore(response.data);
        return response.data;
      } else {
        setCreditScoreError(response.error || 'Failed to load credit score');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load credit score';
      setCreditScoreError(errorMessage);
      return null;
    } finally {
      setCreditScoreLoading(false);
    }
  }, []);

  // Apply for loan
  const applyForLoan = useCallback(async (request: LoanApplicationRequest) => {
    setLoanLoading(true);
    setLoanError(null);
    
    try {
      const response = await businessFinanceAPI.applyForLoan(request);
      
      if (response.success && response.data) {
        setLoanApplication(response.data);
        return response.data;
      } else {
        setLoanError(response.error || 'Failed to submit loan application');
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit loan application';
      setLoanError(errorMessage);
      return null;
    } finally {
      setLoanLoading(false);
    }
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setBalanceError(null);
    setTransactionsError(null);
    setWithdrawalError(null);
    setCreditScoreError(null);
    setLoanError(null);
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setBusinessBalance(null);
    setBusinessTransactions(null);
    setCreditScore(null);
    setLoanApplication(null);
    clearErrors();
  }, [clearErrors]);

  return {
    // Business Balance
    businessBalance,
    balanceLoading,
    balanceError,
    getBusinessBalance,

    // Chain-specific Balance
    chainBalance,
    chainBalanceLoading,
    chainBalanceError,
    getBusinessBalanceByChain,

    // Business Transactions
    businessTransactions,
    transactionsLoading,
    transactionsError,
    getBusinessTransactionHistory,

    // Withdrawals
    withdrawalLoading,
    withdrawalError,
    withdrawToPersonal,
    withdrawToMpesa,

    // Credit Score
    creditScore,
    creditScoreLoading,
    creditScoreError,
    getBusinessCreditScore,

    // Loan Applications
    loanApplication,
    loanLoading,
    loanError,
    applyForLoan,

    // Utility functions
    clearErrors,
    clearData
  };
};
