"use client";

import React, { useState } from "react";
import { walletAPI } from "@/lib/wallet";
import toast from "react-hot-toast";

const TokenTest: React.FC = () => {
  const [testToken, setTestToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Working token from your curl command
  const workingToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2MWMyNGUyYjAxZGY0MGU0NzY1MDVhYSIsImVtYWlsIjoiZ3JpZmZpbmVzb255YW5nb0BnbWFpbC5jb20iLCJwaG9uZU51bWJlciI6IisyNTQ3NTkyODA4NzUiLCJ3YWxsZXRBZGRyZXNzIjoiMHgzMWM0MUJDYTgzNUMwZDNjNTk3Y2JCYUZmMmU4ZEJGOTczNjQ1ZmI0IiwiaWF0IjoxNzU2MTI2Njk3LCJleHAiOjE3NTYyMTMwOTd9.b6JfqS16Sl71Ea-E1Vlc_kz9u162CmRBUWApd_wvC_8";

  const testWithCurrentToken = async () => {
    setLoading(true);
    try {
      const currentToken = localStorage.getItem('dotpay_token');
      console.log('Testing with current token:', currentToken);
      
      const response = await walletAPI.getBalance();
      setResult(response);
      toast.success('API call successful!');
    } catch (error: any) {
      console.error('API call failed:', error);
      setResult({ error: error.message, response: error.response?.data });
      toast.error('API call failed');
    } finally {
      setLoading(false);
    }
  };

  const testWithWorkingToken = async () => {
    setLoading(true);
    try {
      // Temporarily set the working token
      const originalToken = localStorage.getItem('dotpay_token');
      localStorage.setItem('dotpay_token', workingToken);
      
      console.log('Testing with working token:', workingToken);
      
      const response = await walletAPI.getBalance();
      setResult(response);
      toast.success('API call successful with working token!');
      
      // Restore original token
      if (originalToken) {
        localStorage.setItem('dotpay_token', originalToken);
      }
    } catch (error: any) {
      console.error('API call failed:', error);
      setResult({ error: error.message, response: error.response?.data });
      toast.error('API call failed');
    } finally {
      setLoading(false);
    }
  };

  const testWithCustomToken = async () => {
    if (!testToken) {
      toast.error('Please enter a token');
      return;
    }

    setLoading(true);
    try {
      // Temporarily set the custom token
      const originalToken = localStorage.getItem('dotpay_token');
      localStorage.setItem('dotpay_token', testToken);
      
      console.log('Testing with custom token:', testToken);
      
      const response = await walletAPI.getBalance();
      setResult(response);
      toast.success('API call successful with custom token!');
      
      // Restore original token
      if (originalToken) {
        localStorage.setItem('dotpay_token', originalToken);
      }
    } catch (error: any) {
      console.error('API call failed:', error);
      setResult({ error: error.message, response: error.response?.data });
      toast.error('API call failed');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTokenInfo = () => {
    const currentToken = localStorage.getItem('dotpay_token');
    if (!currentToken) return null;

    try {
      const payload = JSON.parse(atob(currentToken.split('.')[1]));
      return payload;
    } catch (error) {
      return { error: 'Invalid token format' };
    }
  };

  const getWorkingTokenInfo = () => {
    try {
      const payload = JSON.parse(atob(workingToken.split('.')[1]));
      return payload;
    } catch (error) {
      return { error: 'Invalid token format' };
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Token Testing</h2>
      
      {/* Current Token Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Current Token Info:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(getCurrentTokenInfo(), null, 2)}
        </pre>
      </div>

      {/* Working Token Info */}
      <div className="mb-6 p-4 bg-green-50 rounded">
        <h3 className="font-semibold mb-2">Working Token Info:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(getWorkingTokenInfo(), null, 2)}
        </pre>
      </div>

      {/* Test Buttons */}
      <div className="space-y-4 mb-6">
        <button
          onClick={testWithCurrentToken}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mr-4"
        >
          Test with Current Token
        </button>
        
        <button
          onClick={testWithWorkingToken}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 mr-4"
        >
          Test with Working Token
        </button>
      </div>

      {/* Custom Token Test */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Test with Custom Token:</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testToken}
            onChange={(e) => setTestToken(e.target.value)}
            placeholder="Enter token here..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={testWithCustomToken}
            disabled={loading || !testToken}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Test
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TokenTest;