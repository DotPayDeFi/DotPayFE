import { cryptoAPI } from './crypto';

export interface BalanceValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
  actualBalance?: number;
  requestedAmount?: number;
  tokenType?: string;
  chain?: string;
}

/**
 * Validates if user has sufficient balance for a transaction
 */
export const validateBalance = async (
  chain: string,
  tokenType: string,
  amount: number
): Promise<BalanceValidationResult> => {
  try {
    // Fetch the user's balance for the specific chain
    const balanceResponse = await cryptoAPI.getBalance();
    
    if (!balanceResponse.success || !balanceResponse.data?.balances) {
      return {
        isValid: false,
        error: 'Failed to fetch balance information',
        suggestions: ['Check your internet connection', 'Try again in a few moments']
      };
    }

    const balances = balanceResponse.data.balances;
    const actualBalance = balances[tokenType as keyof typeof balances];
    
    if (actualBalance === undefined) {
      return {
        isValid: false,
        error: `${tokenType} balance not found on ${chain} network`,
        suggestions: [
          `Make sure you have ${tokenType} tokens on the ${chain} network`,
          'Check if the token is supported on this network',
          'Try switching to a different network or token'
        ]
      };
    }

    const balance = typeof actualBalance === 'number' ? actualBalance : 0;
    
    if (balance < amount) {
      return {
        isValid: false,
        error: `Insufficient ${tokenType} balance`,
        actualBalance: balance,
        requestedAmount: amount,
        tokenType,
        chain,
        suggestions: [
          `You have ${balance} ${tokenType} but need ${amount} ${tokenType}`,
          'Reduce the transaction amount',
          'Add more tokens to your wallet',
          'Check if you have tokens on the correct network'
        ]
      };
    }

    return {
      isValid: true,
      actualBalance: balance,
      requestedAmount: amount,
      tokenType,
      chain
    };

  } catch (error: any) {
    console.error('Balance validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate balance',
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the issue persists'
      ]
    };
  }
};

/**
 * Gets available tokens and their balances for a specific chain
 */
export const getAvailableTokens = async (chain: string) => {
  try {
    const balanceResponse = await cryptoAPI.getBalance();
    
    if (!balanceResponse.success || !balanceResponse.data?.balances) {
      return [];
    }

    const balances = balanceResponse.data.balances;
    const availableTokens = [];

    for (const [token, balance] of Object.entries(balances)) {
      const tokenBalance = typeof balance === 'number' ? balance : 0;
      if (tokenBalance > 0) {
        availableTokens.push({
          token,
          balance: tokenBalance,
          chain
        });
      }
    }

    return availableTokens;
  } catch (error) {
    console.error('Error getting available tokens:', error);
    return [];
  }
};

/**
 * Suggests alternative tokens if the requested token has insufficient balance
 */
export const suggestAlternativeTokens = async (
  chain: string,
  requestedToken: string,
  requestedAmount: number
) => {
  try {
    const availableTokens = await getAvailableTokens(chain);
    const alternatives = availableTokens.filter(
      token => token.token !== requestedToken && token.balance >= requestedAmount
    );

    return alternatives.map(token => ({
      token: token.token,
      balance: token.balance,
      suggestion: `Use ${token.token} instead (you have ${token.balance} ${token.token})`
    }));
  } catch (error) {
    console.error('Error suggesting alternative tokens:', error);
    return [];
  }
};