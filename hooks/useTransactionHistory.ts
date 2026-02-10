import { useState, useCallback, useEffect, useRef } from 'react';
import { useApi } from './useApi';
import { transactionAPI } from '../lib/transactions';
import { 
  TransactionHistoryResponse, 
  TransactionHistoryFilters,
  Transaction 
} from '../types/transaction-types';

export const useTransactionHistory = () => {
  // API hook
  const transactionHistoryApi = useApi<TransactionHistoryResponse>();
  
  // State for filters and pagination - Smaller page size for better performance
  const [filters, setFilters] = useState<TransactionHistoryFilters>({
    page: 1,
    limit: 5, // Reduced from 10 to 5 for lighter loading
  });
  
  // State for all transactions (for infinite scroll or caching)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const hasLoadedInitialData = useRef(false);

  // Get transaction history - Fixed infinite loop by removing filters dependency
  const getTransactionHistory = useCallback(async (customFilters?: TransactionHistoryFilters) => {
    const currentFilters = { ...filters, ...customFilters };
    
    // Rate limiting: prevent requests more than once every 2 seconds
    const now = Date.now();
    if (now - lastRequestTime < 2000) {
      console.warn('⏰ Rate limiting: Too many requests, please wait');
      return { success: false, error: 'Rate limited' };
    }
    setLastRequestTime(now);
    
    console.log('🚀 useTransactionHistory: Getting transaction history with filters:', currentFilters);
    
    return transactionHistoryApi.execute(
      () => transactionAPI.getHistory(currentFilters),
      {
        showSuccessToast: false,
        showErrorToast: true,
      }
    );
  }, [transactionHistoryApi, lastRequestTime]); // Added lastRequestTime for rate limiting

  // Load more transactions (for pagination) - Optimized with timeout
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      setIsLoadingMore(false);
      console.warn('⏰ Load more timeout - preventing hang');
    }, 10000); // 10 second timeout
    
    try {
      const nextPage = (filters.page || 1) + 1;
      const response = await transactionAPI.getHistory({
        ...filters,
        page: nextPage,
      });
      
      clearTimeout(timeoutId);
      
      if (response.success) {
        setAllTransactions(prev => [...prev, ...response.data.transactions]);
        setFilters(prev => ({ ...prev, page: nextPage }));
        setHasMore(response.data.summary.hasNext);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters, hasMore, isLoadingMore]);

  // Refresh transactions
  const refreshTransactions = useCallback(async () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    setAllTransactions([]);
    setHasMore(false);
    hasLoadedInitialData.current = false; // Reset the ref to allow reloading
    
    try {
      const response = await getTransactionHistory({ page: 1 });
      if (response.success) {
        setAllTransactions(response.data.transactions);
        setHasMore(response.data.summary.hasNext);
      }
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    }
  }, [getTransactionHistory]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<TransactionHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
    setAllTransactions([]);
    setHasMore(false);
    hasLoadedInitialData.current = false; // Reset the ref to allow reloading with new filters
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({ page: 1, limit: 5 }); // Keep consistent with initial limit
    setAllTransactions([]);
    setHasMore(false);
    hasLoadedInitialData.current = false; // Reset the ref to allow reloading
  }, []);

  // Load initial data - Fixed infinite loop using ref to track loaded state
  useEffect(() => {
    const loadInitialData = async () => {
      if (hasLoadedInitialData.current) {
        console.log('🔄 useTransactionHistory: Initial data already loaded, skipping...');
        return;
      }
      
      console.log('🔄 useTransactionHistory: Loading initial data...');
      hasLoadedInitialData.current = true;
      
      // Rate limiting: prevent requests more than once every 2 seconds
      const now = Date.now();
      if (now - lastRequestTime < 2000) {
        console.warn('⏰ Rate limiting: Too many requests, please wait');
        hasLoadedInitialData.current = false; // Reset so it can try again later
        return;
      }
      setLastRequestTime(now);
      
      // Add timeout to prevent hanging on initial load
      const timeoutId = setTimeout(() => {
        console.warn('⏰ Initial load timeout - preventing hang');
        hasLoadedInitialData.current = false; // Reset so it can try again later
      }, 15000); // 15 second timeout for initial load
      
      try {
        // Use direct API call instead of getTransactionHistory to avoid dependency issues
        const response = await transactionHistoryApi.execute(
          () => transactionAPI.getHistory(filters),
          {
            showSuccessToast: false,
            showErrorToast: true,
          }
        );
        clearTimeout(timeoutId);
        
        console.log('📊 useTransactionHistory: Initial data response:', response);
        
        if (response.success) {
          console.log('✅ useTransactionHistory: Setting transactions:', response.data.transactions);
          setAllTransactions(response.data.transactions);
          setHasMore(response.data.summary.hasNext);
        } else {
          console.log('❌ useTransactionHistory: Response not successful:', response);
          hasLoadedInitialData.current = false; // Reset so it can try again later
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ useTransactionHistory: Failed to load initial transaction data:', error);
        hasLoadedInitialData.current = false; // Reset so it can try again later
      }
    };

    loadInitialData();
  }, []); // Empty dependency array - runs only once

  return {
    // Data
    transactions: allTransactions,
    summary: transactionHistoryApi.data?.data?.summary,
    filtersInfo: transactionHistoryApi.data?.data?.filters,
    
    // Loading states
    loading: transactionHistoryApi.loading,
    loadingMore: isLoadingMore,
    
    // Error
    error: transactionHistoryApi.error,
    
    // Actions
    getTransactionHistory,
    loadMore,
    refreshTransactions,
    updateFilters,
    clearFilters,
    
    // Filter state
    currentFilters: filters,
    hasMore,
  };
};
