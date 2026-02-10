import React from 'react';
import { BalanceValidationResult } from '@/lib/balanceValidator';
import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface BalanceValidationAlertProps {
  validationResult: BalanceValidationResult | null;
  isValidating: boolean;
  className?: string;
}

export const BalanceValidationAlert: React.FC<BalanceValidationAlertProps> = ({
  validationResult,
  isValidating,
  className = ''
}) => {
  if (isValidating) {
    return (
      <div className={`flex items-center gap-2 p-3 border border-blue-200 bg-blue-50 rounded-md ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-blue-800 text-sm">Checking balance...</span>
      </div>
    );
  }

  if (!validationResult) {
    return null;
  }

  const { isValid, error, actualBalance, requestedAmount } = validationResult;

  const getIcon = () => {
    if (isValid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getAlertClassName = () => {
    if (isValid) {
      return 'border-green-200 bg-green-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  const getTextClassName = () => {
    if (isValid) {
      return 'text-green-800';
    } else {
      return 'text-red-800';
    }
  };

  return (
    <div className={`flex items-start gap-2 p-3 border rounded-md ${getAlertClassName()} ${className}`}>
      {getIcon()}
      <div className={`flex-1 ${getTextClassName()}`}>
        <div className="space-y-1">
          <p className="font-medium text-sm">{error || 'Balance validation completed'}</p>
        </div>
      </div>
    </div>
  );
};

export default BalanceValidationAlert;
