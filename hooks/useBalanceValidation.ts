import { useState, useCallback, useRef } from 'react';
import { validateBalance, getAvailableTokens, suggestAlternativeTokens } from '../lib/balanceValidator';
import { BalanceValidationResult } from '../lib/balanceValidator';

export const useBalanceValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BalanceValidationResult | null>(null);

  const validateTransaction = useCallback(async (
    chain: string,
    tokenType: string,
    amount: number
  ): Promise<BalanceValidationResult> => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateBalance(chain, tokenType, amount);
      setValidationResult(result);
      return result;
    } catch (error) {
      const errorResult: BalanceValidationResult = {
        isValid: false,
        error: 'Validation failed',
        suggestions: ['Try again in a few moments']
      };
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const getTokensForChain = useCallback(async (chain: string) => {
    try {
      return await getAvailableTokens(chain);
    } catch (error) {
      console.error('Error getting tokens for chain:', error);
      return [];
    }
  }, []);

  const getAlternatives = useCallback(async (
    chain: string,
    requestedToken: string,
    requestedAmount: number
  ) => {
    try {
      return await suggestAlternativeTokens(chain, requestedToken, requestedAmount);
    } catch (error) {
      console.error('Error getting alternative tokens:', error);
      return [];
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validateTransaction,
    getTokensForChain,
    getAlternatives,
    clearValidation,
    isValidating,
    validationResult
  };
};

// Hook for SendTokenForm component with debouncing
export const useUserBalanceValidation = ({ debounceMs = 500 }: { debounceMs?: number } = {}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BalanceValidationResult | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedValidateUserBalance = useCallback(async (
    chain: string,
    tokenType: string,
    amount: number
  ) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      setIsValidating(true);
      setValidationResult(null);

      try {
        const result = await validateBalance(chain, tokenType, amount);
        setValidationResult(result);
      } catch (error) {
        const errorResult: BalanceValidationResult = {
          isValid: false,
          error: 'Validation failed',
          suggestions: ['Try again in a few moments']
        };
        setValidationResult(errorResult);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  const clearValidation = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setValidationResult(null);
  }, []);

  return {
    validationResult,
    isValidating,
    debouncedValidateUserBalance,
    clearValidation
  };
};

// Hook for BusinessWithdrawal component
export const useBusinessBalanceValidation = ({ debounceMs = 500 }: { debounceMs?: number } = {}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BalanceValidationResult | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateBusinessBalance = useCallback(async (
    chain: string,
    tokenType: string,
    amount: number
  ): Promise<BalanceValidationResult> => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateBalance(chain, tokenType, amount);
      setValidationResult(result);
      return result;
    } catch (error) {
      const errorResult: BalanceValidationResult = {
        isValid: false,
        error: 'Business balance validation failed',
        suggestions: ['Try again in a few moments']
      };
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const debouncedValidateBusinessBalance = useCallback(async (
    chain: string,
    tokenType: string,
    amount: number
  ) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      setIsValidating(true);
      setValidationResult(null);

      try {
        const result = await validateBalance(chain, tokenType, amount);
        setValidationResult(result);
      } catch (error) {
        const errorResult: BalanceValidationResult = {
          isValid: false,
          error: 'Business balance validation failed',
          suggestions: ['Try again in a few moments']
        };
        setValidationResult(errorResult);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  const clearValidation = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setValidationResult(null);
  }, []);

  return {
    validateBusinessBalance,
    debouncedValidateBusinessBalance,
    clearValidation,
    isValidating,
    validationResult
  };
};