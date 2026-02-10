import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cryptoAPI } from '@/lib/crypto';
import { mpesaAPI } from '@/lib/mpesa';
import { businessFinanceAPI } from '@/lib/business-finance-api';

/**
 * Error Handling Demo Component
 * 
 * This component demonstrates the enhanced error handling system
 * by simulating various error scenarios that users might encounter.
 */
export const ErrorHandlingDemo: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any) => {
    setResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test 1: Token Send with Insufficient Balance
  const testTokenSendInsufficientBalance = async () => {
    setLoading(true);
    try {
      // This will likely fail with insufficient balance
      await cryptoAPI.sendToken({
        recipientIdentifier: 'test@example.com',
        amount: 999999, // Very large amount
        senderAddress: '0x1234567890123456789012345678901234567890',
        chain: 'arbitrum',
        tokenSymbol: 'USDC',
        password: 'test123'
      });
    } catch (error: any) {
      addResult('Token Send - Insufficient Balance', {
        errorType: error.error?.code || 'Unknown',
        message: error.error?.message || error.message,
        hasBalanceInfo: !!error.error?.currentBalance,
        balance: error.error?.currentBalance
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Business Payment with Insufficient Balance
  const testBusinessPaymentInsufficientBalance = async () => {
    setLoading(true);
    try {
      await cryptoAPI.payMerchant({
        senderAddress: '0x1234567890123456789012345678901234567890',
        merchantId: 'test-merchant',
        amount: 999999, // Very large amount
        confirm: true,
        chainName: 'arbitrum',
        tokenSymbol: 'USDC',
        googleAuthCode: '123456'
      });
    } catch (error: any) {
      addResult('Business Payment - Insufficient Balance', {
        errorType: error.error?.code || 'Unknown',
        message: error.error?.message || error.message,
        hasBalanceInfo: !!error.error?.currentBalance,
        balance: error.error?.currentBalance
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 3: MPESA Withdrawal with Insufficient Balance
  const testMpesaWithdrawalInsufficientBalance = async () => {
    setLoading(true);
    try {
      await mpesaAPI.withdraw({
        amount: '999999', // Very large amount
        phoneNumber: '254700000000',
        token: 'USDC',
        chain: 'arbitrum'
      });
    } catch (error: any) {
      addResult('MPESA Withdrawal - Insufficient Balance', {
        errorType: error.error?.code || 'Unknown',
        message: error.error?.message || error.message,
        hasBalanceInfo: !!error.error?.currentBalance,
        balance: error.error?.currentBalance
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Business Withdrawal with Insufficient Balance
  const testBusinessWithdrawalInsufficientBalance = async () => {
    setLoading(true);
    try {
      await businessFinanceAPI.withdrawToPersonal({
        businessId: 'test-business-id',
        amount: 999999, // Very large amount
        tokenType: 'USDC',
        chain: 'arbitrum'
      });
    } catch (error: any) {
      addResult('Business Withdrawal - Insufficient Balance', {
        errorType: error.error?.code || 'Unknown',
        message: error.error?.message || error.message,
        hasBalanceInfo: !!error.error?.currentBalance,
        balance: error.error?.currentBalance
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 5: Crypto Payment with Insufficient Balance
  const testCryptoPaymentInsufficientBalance = async () => {
    setLoading(true);
    try {
      await mpesaAPI.payWithCrypto({
        amount: 1000, // KES amount
        cryptoAmount: 999999, // Very large crypto amount
        targetType: 'paybill',
        targetNumber: '123456',
        accountNumber: '123456789',
        chain: 'arbitrum',
        tokenType: 'USDC',
        description: 'Test payment',
        password: 'test123'
      });
    } catch (error: any) {
      addResult('Crypto Payment - Insufficient Balance', {
        errorType: error.error?.code || 'Unknown',
        message: error.error?.message || error.message,
        hasBalanceInfo: !!error.error?.currentBalance,
        balance: error.error?.currentBalance
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Demo</CardTitle>
          <CardDescription>
            Test the enhanced error handling system by simulating various error scenarios.
            This demonstrates how users receive clear, actionable error messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testTokenSendInsufficientBalance}
              disabled={loading}
              variant="outline"
            >
              Test Token Send (Insufficient Balance)
            </Button>
            
            <Button 
              onClick={testBusinessPaymentInsufficientBalance}
              disabled={loading}
              variant="outline"
            >
              Test Business Payment (Insufficient Balance)
            </Button>
            
            <Button 
              onClick={testMpesaWithdrawalInsufficientBalance}
              disabled={loading}
              variant="outline"
            >
              Test MPESA Withdrawal (Insufficient Balance)
            </Button>
            
            <Button 
              onClick={testBusinessWithdrawalInsufficientBalance}
              disabled={loading}
              variant="outline"
            >
              Test Business Withdrawal (Insufficient Balance)
            </Button>
            
            <Button 
              onClick={testCryptoPaymentInsufficientBalance}
              disabled={loading}
              variant="outline"
            >
              Test Crypto Payment (Insufficient Balance)
            </Button>
            
            <Button 
              onClick={clearResults}
              disabled={loading}
              variant="destructive"
            >
              Clear Results
            </Button>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Testing error handling...</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Test Results</h3>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{result.test}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Error Type:</span> 
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            result.errorType === 'INSUFFICIENT_BALANCE' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {result.errorType}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium">Message:</span>
                          <p className="mt-1 text-gray-700">{result.message}</p>
                        </div>
                        
                        {result.hasBalanceInfo && (
                          <div>
                            <span className="font-medium">Balance Info:</span>
                            <p className="mt-1 text-gray-700">
                              {result.balance ? 
                                `${result.balance.amount} ${result.balance.token} on ${result.balance.chain}` :
                                'Balance information available'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What to Look For:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clear, actionable error messages instead of cryptic blockchain errors</li>
              <li>• Specific error codes (INSUFFICIENT_BALANCE, etc.)</li>
              <li>• Real-time balance information when available</li>
              <li>• Operation-specific messaging (send, pay, withdraw, etc.)</li>
              <li>• Request IDs and timestamps for debugging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorHandlingDemo;
