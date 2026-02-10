// Test file for CryptoErrorHandler
// This file demonstrates how the error handling works

import { CryptoErrorHandler, ErrorHandlerContext } from './errorHandler';

// Mock error scenarios for testing
const mockInsufficientBalanceError = {
  message: 'ERC20: transfer amount exceeds balance',
  response: {
    status: 400,
    data: {
      message: 'Transfer amount exceeds balance'
    }
  }
};

const mockNetworkError = {
  code: 'NETWORK_ERROR',
  message: 'Network Error'
};

const mockUserRejectedError = {
  code: 4001,
  message: 'User rejected the transaction'
};

// Test contexts
const userContext: ErrorHandlerContext = {
  senderAddress: '0x1234567890123456789012345678901234567890',
  chain: 'arbitrum',
  tokenSymbol: 'USDC',
  amount: 1.5,
  operation: 'token send'
};

const businessContext: ErrorHandlerContext = {
  businessAddress: '0x9876543210987654321098765432109876543210',
  chain: 'arbitrum',
  tokenSymbol: 'USDC',
  amount: 2.0,
  operation: 'business withdrawal',
  businessName: 'Test Business'
};

// Test functions
export const testErrorHandling = async () => {
  console.log('🧪 Testing CryptoErrorHandler...\n');

  // Test 1: User insufficient balance
  console.log('Test 1: User Insufficient Balance');
  try {
    const result = await CryptoErrorHandler.handleCryptoError(
      mockInsufficientBalanceError,
      null,
      userContext
    );
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Business insufficient balance
  console.log('Test 2: Business Insufficient Balance');
  try {
    const result = await CryptoErrorHandler.handleBusinessCryptoError(
      mockInsufficientBalanceError,
      null,
      businessContext
    );
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Network error
  console.log('Test 3: Network Error');
  try {
    const result = await CryptoErrorHandler.handleCryptoError(
      mockNetworkError,
      null,
      userContext
    );
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: User rejected error
  console.log('Test 4: User Rejected Error');
  try {
    const result = await CryptoErrorHandler.handleCryptoError(
      mockUserRejectedError,
      null,
      userContext
    );
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n🎉 All tests completed!');
};

// Export for use in other files
export default testErrorHandling;
