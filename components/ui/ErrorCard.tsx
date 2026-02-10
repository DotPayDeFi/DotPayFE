import React from 'react';

interface ErrorCardProps {
  error: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
  title?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  onDismiss,
  onRetry,
  showRetry = true,
  title = "Transaction Failed"
}) => {
  // Function to get helpful suggestions based on error
  const getErrorSuggestions = (errorMessage: string) => {
    const suggestions = [];
    
    if (errorMessage.toLowerCase().includes('insufficient balance')) {
      suggestions.push('Check your wallet balance and ensure you have enough tokens');
      suggestions.push('Consider using a smaller amount for the transaction');
    }
    
    if (errorMessage.toLowerCase().includes('minimum')) {
      suggestions.push('Increase the transaction amount to meet the minimum requirement');
      suggestions.push('Check the minimum amount requirements for M-Pesa transactions');
    }
    
    if (errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('password')) {
      suggestions.push('Verify your password is correct');
      suggestions.push('Try logging out and logging back in');
    }
    
    if (errorMessage.toLowerCase().includes('phone') || errorMessage.toLowerCase().includes('format')) {
      suggestions.push('Ensure the phone number is in the correct format (+254XXXXXXXXX)');
      suggestions.push('Check that the phone number is a valid Kenyan number');
    }
    
    if (errorMessage.toLowerCase().includes('validation')) {
      suggestions.push('Check that all required fields are filled correctly');
      suggestions.push('Verify the data format matches the requirements');
    }
    
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Try again in a few moments');
      suggestions.push('Contact support if the issue persists');
    }
    
    return suggestions;
  };

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 mr-3">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-red-400 font-semibold text-lg">{title}</h3>
          <p className="text-red-300 text-sm">Please review the error details below</p>
        </div>
      </div>
      
      <div className="bg-red-900/30 rounded-lg p-4 mb-4">
        <p className="text-red-300 text-sm font-medium mb-2">Error Details:</p>
        <div className="text-red-200 text-sm whitespace-pre-line">
          {error.split('\n').map((line, index) => {
            if (line.startsWith('Error Code:') || line.startsWith('Details:')) {
              return (
                <div key={index} className="font-semibold text-red-100 mb-1">
                  {line}
                </div>
              );
            } else if (line.includes(':')) {
              return (
                <div key={index} className="ml-2 text-red-200 mb-1">
                  • {line}
                </div>
              );
            } else if (line.trim()) {
              return (
                <div key={index} className="text-red-200 mb-1">
                  {line}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
      
      {/* Helpful Suggestions */}
      {getErrorSuggestions(error).length > 0 && (
        <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
          <p className="text-blue-300 text-sm font-medium mb-2">💡 Suggestions:</p>
          <ul className="text-blue-200 text-sm space-y-1">
            {getErrorSuggestions(error).map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex space-x-3">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors duration-200"
          >
            Dismiss
          </button>
        )}
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};
