// Utility functions for handling API errors

export interface DetailedError {
  message: string;
  details: string;
  code?: string;
  suggestions: string[];
}

/**
 * Extracts detailed error information from API error responses
 */
export const extractErrorDetails = (err: any): DetailedError => {
  let errorMessage = 'Request failed';
  let errorDetails = '';
  let errorCode = '';

  if (err.response?.data) {
    const errorData = err.response.data;

    // Get the main error message
    errorMessage = errorData.message || errorData.error?.message || 'Transaction failed';

    // Get error code
    if (errorData.error?.code) {
      errorCode = errorData.error.code;
    }

    // Get detailed error information
    if (errorData.error) {
      const error = errorData.error;
      const details = [];

      if (error.code) {
        details.push(`Error Code: ${error.code}`);
      }

      if (error.message && error.message !== errorMessage) {
        details.push(`Details: ${error.message}`);
      }

      if (error.details && Array.isArray(error.details)) {
        error.details.forEach((detail: any) => {
          if (detail.field && detail.message) {
            details.push(`${detail.field}: ${detail.message}`);
          } else if (detail.message) {
            details.push(detail.message);
          }
        });
      }

      if (details.length > 0) {
        errorDetails = details.join('\n');
      }
    }
  } else if (err.message) {
    errorMessage = err.message;
  }

  // Get suggestions based on error type
  const suggestions = getErrorSuggestions(errorMessage, errorDetails);

  return {
    message: errorMessage,
    details: errorDetails,
    code: errorCode,
    suggestions
  };
};

/**
 * Gets helpful suggestions based on error message
 */
export const getErrorSuggestions = (errorMessage: string, errorDetails?: string): string[] => {
  const suggestions = [];
  const lowerMessage = errorMessage.toLowerCase();
  const lowerDetails = errorDetails?.toLowerCase() || '';

  if (lowerMessage.includes('insufficient balance')) {
    // Extract balance information from error details
    const balanceMatch = lowerDetails.match(/balance \((\d+\.?\d*)\)/);
    const amountMatch = lowerDetails.match(/amount \((\d+\.?\d*)\)/);
    
    if (balanceMatch && amountMatch) {
      const currentBalance = parseFloat(balanceMatch[1]);
      const requiredAmount = parseFloat(amountMatch[1]);
      const shortfall = requiredAmount - currentBalance;
      
      suggestions.push(`You have ${currentBalance.toFixed(6)} tokens but need ${requiredAmount.toFixed(6)} tokens`);
      suggestions.push(`You need ${shortfall.toFixed(6)} more tokens to complete this transaction`);
      suggestions.push('Add more tokens to your wallet or reduce the transaction amount');
      
      // Check if this might be a balance discrepancy issue
      if (currentBalance === 0 && lowerDetails.includes('usdt')) {
        suggestions.push('💡 Note: There may be a balance detection issue with USDT. Try using USDC instead, or contact support.');
      }
    } else {
      suggestions.push('Check your wallet balance and ensure you have enough tokens');
      suggestions.push('Consider using a smaller amount for the transaction');
    }
  }

  if (lowerMessage.includes('minimum')) {
    suggestions.push('Increase the transaction amount to meet the minimum requirement');
    suggestions.push('Check the minimum amount requirements for M-Pesa transactions');
  }

  if (lowerMessage.includes('authentication') || lowerMessage.includes('password')) {
    suggestions.push('Verify your password is correct');
    suggestions.push('Try logging out and logging back in');
  }

  if (lowerMessage.includes('phone') || lowerMessage.includes('format')) {
    suggestions.push('Ensure the phone number is in the correct format (+254XXXXXXXXX)');
    suggestions.push('Check that the phone number is a valid Kenyan number');
  }

  if (lowerMessage.includes('validation')) {
    suggestions.push('Check that all required fields are filled correctly');
    suggestions.push('Verify the data format matches the requirements');
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    suggestions.push('Check your internet connection');
    suggestions.push('Try again in a few moments');
  }

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    suggestions.push('Wait a few minutes before trying again');
    suggestions.push('Reduce the frequency of your requests');
  }

  if (lowerMessage.includes('expired') || lowerMessage.includes('invalid token')) {
    suggestions.push('Your session may have expired');
    suggestions.push('Please log in again to continue');
  }

  if (suggestions.length === 0) {
    suggestions.push('Try again in a few moments');
    suggestions.push('Contact support if the issue persists');
  }

  return suggestions;
};

/**
 * Formats error for display in UI
 */
export const formatErrorForDisplay = (error: DetailedError): string => {
  if (error.details) {
    return `${error.message}\n\n${error.details}`;
  }
  return error.message;
};
