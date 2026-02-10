import React, { useState, useEffect } from 'react';
import { cryptoAPI } from '../../lib/crypto';

interface SmartTokenSelectorProps {
  chain: string;
  selectedToken: string;
  onTokenChange: (token: string) => void;
  amount: number;
  className?: string;
}

interface TokenInfo {
  token: string;
  balance: number;
  hasSufficientBalance: boolean;
  isRecommended: boolean;
}

export const SmartTokenSelector: React.FC<SmartTokenSelectorProps> = ({
  chain,
  selectedToken,
  onTokenChange,
  amount,
  className = ""
}) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await cryptoAPI.getBalance();
      
      // Define all supported tokens
      const supportedTokens = ['USDC', 'USDT', 'DAI'];
      const tokenInfos: TokenInfo[] = [];
      
      if (response.success && response.data?.balances) {
        const balances = response.data.balances;
        
        // Add all supported tokens, even if balance is 0
        for (const token of supportedTokens) {
          const tokenBalance = typeof balances[token] === 'number' ? balances[token] : 0;
          const hasSufficientBalance = Number(tokenBalance) >= Number(amount);
          
          tokenInfos.push({
            token,
            balance: Number(tokenBalance),
            hasSufficientBalance,
            isRecommended: false // Remove recommendations
          });
        }
        
        // Sort tokens by balance (highest first)
        tokenInfos.sort((a, b) => b.balance - a.balance);
        
        setTokens(tokenInfos);
      } else {
        // If API fails, still show supported tokens with 0 balance
        for (const token of supportedTokens) {
          tokenInfos.push({
            token,
            balance: 0,
            hasSufficientBalance: false,
            isRecommended: false
          });
        }
        setTokens(tokenInfos);
      }
    } catch (err: any) {
      console.error('Error fetching token info:', err);
      // Even on error, show supported tokens
      const supportedTokens = ['USDC', 'USDT', 'DAI'];
      const tokenInfos: TokenInfo[] = supportedTokens.map(token => ({
        token,
        balance: 0,
        hasSufficientBalance: false,
        isRecommended: false
      }));
      setTokens(tokenInfos);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenInfo();
  }, [chain, amount]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Type
        </label>
        <div className="animate-pulse bg-gray-700 rounded-md h-10"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Type
        </label>
        <div className="bg-red-900/20 border border-red-500/30 rounded-md p-3">
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Token Type
      </label>
      
      <select
        value={selectedToken}
        onChange={(e) => onTokenChange(e.target.value)}
        className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
      >
        {tokens.map((tokenInfo) => (
          <option key={tokenInfo.token} value={tokenInfo.token}>
            {tokenInfo.token} - Bal: {tokenInfo.balance.toFixed(6)}
          </option>
        ))}
      </select>
    </div>
  );
};
