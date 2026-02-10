import { useState } from 'react';
import toast from 'react-hot-toast';

// Generic API hook for handling loading states and errors
export const useApi = <T = any>() => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (
    apiCall: () => Promise<any>,
    options?: {
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      successMessage?: string;
      onSuccess?: (data: any) => void;
      onError?: (error: any) => void;
    }
  ) => {
    const {
      showSuccessToast = false,
      showErrorToast = true,
      successMessage,
      onSuccess,
      onError,
    } = options || {};

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall();
      setData(response);

      if (showSuccessToast) {
        toast.success(successMessage || response.message || 'Operation successful');
      }

      if (onSuccess) {
        onSuccess(response);
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);

      if (showErrorToast) {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
  };

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
};