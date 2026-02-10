import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserBalanceValidation } from '@/hooks/useBalanceValidation';
import BalanceValidationAlert from '../ui/BalanceValidationAlert';
import { Badge } from '@/components/ui/badge';

/**
 * Real-Time Balance Validation Demo Component
 * 
 * This component demonstrates the real-time balance validation system
 * that automatically warns users when they input amounts higher than their available balance.
 */
export const RealTimeBalanceDemo: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState('USDC');
  const [chain, setChain] = useState('arbitrum');
  const [operation, setOperation] = useState('token send');

  // Balance validation hook
  const {
    validationResult,
    isValidating,
    debouncedValidateUserBalance,
    clearValidation
  } = useUserBalanceValidation({
    debounceMs: 500 // 500ms debounce for demo
  });

  // Real-time balance validation
  useEffect(() => {
    const amountValue = parseFloat(amount);
    
    if (amountValue > 0 && chain && tokenType) {
      debouncedValidateUserBalance(
        chain,
        tokenType,
        amountValue
      );
    } else {
      clearValidation();
    }
  }, [amount, chain, tokenType, operation, debouncedValidateUserBalance, clearValidation]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleTokenChange = (value: string) => {
    setTokenType(value);
  };

  const handleChainChange = (value: string) => {
    setChain(value);
  };

  const handleOperationChange = (value: string) => {
    setOperation(value);
  };

  const getValidationStatus = () => {
    if (isValidating) {
      return { status: 'checking', color: 'bg-blue-100 text-blue-800' };
    }
    
    if (!validationResult) {
      return { status: 'no-validation', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (validationResult.isValid) {
      return { 
        status: 'valid', 
        color: 'bg-green-100 text-green-800'
      };
    }
    
    return { status: 'invalid', color: 'bg-red-100 text-red-800' };
  };

  const validationStatus = getValidationStatus();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚡ Real-Time Balance Validation Demo
            <Badge variant="outline" className={validationStatus.color}>
              {validationStatus.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            This demo shows how the system automatically validates your balance in real-time
            as you type. Try entering different amounts to see the validation in action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                step="0.000001"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500">
                Enter an amount to see real-time balance validation
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">Token Type</label>
              <select
                id="token"
                value={tokenType}
                onChange={(e) => handleTokenChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="ETH">ETH</option>
                <option value="BTC">BTC</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="chain" className="block text-sm font-medium text-gray-700">Chain</label>
              <select
                id="chain"
                value={chain}
                onChange={(e) => handleChainChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="arbitrum">Arbitrum</option>
                <option value="polygon">Polygon</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="celo">Celo</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="operation" className="block text-sm font-medium text-gray-700">Operation</label>
              <select
                id="operation"
                value={operation}
                onChange={(e) => handleOperationChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="token send">Token Send</option>
                <option value="crypto payment">Crypto Payment</option>
                <option value="crypto withdrawal">Crypto Withdrawal</option>
                <option value="business payment">Business Payment</option>
              </select>
            </div>
          </div>

          {/* Balance Validation Alert */}
          <BalanceValidationAlert
            validationResult={validationResult}
            isValidating={isValidating}
            className="w-full"
          />

          {/* Demo Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-900">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-800">
                <p>• <strong>Real-time validation:</strong> Checks balance as you type (500ms debounce)</p>
                <p>• <strong>Automatic detection:</strong> Identifies insufficient balance errors</p>
                <p>• <strong>Smart warnings:</strong> Warns when using &gt;95% of balance</p>
                <p>• <strong>Clear guidance:</strong> Shows exact shortfall and next steps</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-900">User Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-green-800">
                <p>• <strong>No failed transactions:</strong> Prevents insufficient balance errors</p>
                <p>• <strong>Immediate feedback:</strong> Know your balance before submitting</p>
                <p>• <strong>Clear messaging:</strong> Understand exactly what&apos;s wrong</p>
                <p>• <strong>Actionable guidance:</strong> Know how to fix the issue</p>
              </CardContent>
            </Card>
          </div>

          {/* Current Validation State */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-900">Current Validation State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Amount:</strong> {amount || 'Not entered'}</p>
                  <p><strong>Token:</strong> {tokenType}</p>
                  <p><strong>Chain:</strong> {chain}</p>
                  <p><strong>Operation:</strong> {operation}</p>
                </div>
                <div>
                  <p><strong>Status:</strong> {validationStatus.status}</p>
                  <p><strong>Validating:</strong> {isValidating ? 'Yes' : 'No'}</p>
                  <p><strong>Last Validated:</strong> N/A</p>
                  <p><strong>Has Result:</strong> {validationResult ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Scenarios */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-900">Try These Test Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-yellow-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount('0.1')}
                  className="text-xs"
                >
                  Small Amount (0.1)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount('1000')}
                  className="text-xs"
                >
                  Large Amount (1000)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount('999999')}
                  className="text-xs"
                >
                  Very Large (999999)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount('0')}
                  className="text-xs"
                >
                  Zero Amount (0)
                </Button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Click these buttons to test different amount scenarios and see how the validation responds.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeBalanceDemo;
