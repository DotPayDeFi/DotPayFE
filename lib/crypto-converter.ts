// Crypto conversion utility using CoinGecko API
export interface ConversionRate {
  usd: number;
  kes: number; // 1 USD = X KES
}

export interface CryptoConversion {
  fiatAmount: number;
  fiatCurrency: 'KES' | 'USD';
  cryptoAmount: number;
  cryptoToken: string;
  conversionRate: number;
}

class CryptoConverter {
  private rates: ConversionRate | null = null;
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get current conversion rates
  async getConversionRates(): Promise<ConversionRate> {
    const now = Date.now();
    
    // Return cached rates if still valid
    if (this.rates && (now - this.lastUpdate) < this.CACHE_DURATION) {
      return this.rates;
    }

    try {
      // Get real-time KES to USD rate from Exchange Rate API
      const kesResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const kesData = await kesResponse.json();
      
      // Fix: Ensure we get the correct KES rate
      // The API returns rates where 1 USD = X KES
      // So if 1 USD = 155 KES, then 1 KES = 1/155 USD
      const usdToKes = kesData.rates?.KES;
      if (!usdToKes || usdToKes <= 0) {
        throw new Error('Invalid KES rate received');
      }
      
      const kesToUsd = 1 / usdToKes; // Convert to 1 KES = X USD
      
      // Get USD rates from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd');
      const data = await response.json();
      
      this.rates = {
        usd: data['usd-coin']?.usd || 1,
        kes: kesToUsd
      };
      
      console.log('Updated conversion rates:', {
        usd: this.rates.usd,
        kes: this.rates.kes,
        '1 USD': `${usdToKes.toFixed(2)} KES`,
        '1 KES': `${kesToUsd.toFixed(6)} USD`,
        'Validation': `${(1 / kesToUsd).toFixed(2)} KES = 1 USD`
      });
      
      this.lastUpdate = now;
      return this.rates;
    } catch (error) {
      console.error('Failed to fetch conversion rates:', error);
      
      // Fallback rates (realistic values)
      const fallbackUsdToKes = 155; // 1 USD = 155 KES (realistic)
      const fallbackKesToUsd = 1 / fallbackUsdToKes; // 1 KES = 0.00645 USD
      
      this.rates = {
        usd: 1,
        kes: fallbackKesToUsd
      };
      
      console.log('Using fallback rates:', {
        '1 USD': `${fallbackUsdToKes} KES`,
        '1 KES': `${fallbackKesToUsd.toFixed(6)} USD`
      });
      
      return this.rates;
    }
  }

  // Convert fiat amount to crypto amount
  async convertFiatToCrypto(
    fiatAmount: number, 
    fiatCurrency: 'KES' | 'USD', 
    cryptoToken: string
  ): Promise<CryptoConversion> {
    const rates = await this.getConversionRates();
    
    // Validation: Ensure rates are realistic
    if (rates.kes <= 0 || rates.kes > 1) {
      throw new Error(`Invalid KES rate: ${rates.kes}. Rate should be between 0 and 1.`);
    }
    
    let usdAmount: number;
    if (fiatCurrency === 'KES') {
      usdAmount = fiatAmount * rates.kes;
      
      // Validation: Ensure conversion is realistic
      // 1 KES should be roughly 0.006-0.007 USD (1 USD = 150-170 KES)
      if (rates.kes < 0.005 || rates.kes > 0.01) {
        console.warn(`Suspicious KES rate: ${rates.kes}. Expected: 0.005-0.01`);
      }
      
      // Additional validation: 10 KES should not give more than 1 USDC
      if (fiatAmount > 0 && usdAmount > fiatAmount * 0.1) {
        throw new Error(`Conversion error: ${fiatAmount} KES = ${usdAmount} USD is unrealistic`);
      }
    } else {
      usdAmount = fiatAmount;
    }

    // Convert USD to crypto (assuming 1:1 for USDC, adjust for other tokens)
    let cryptoAmount: number;
    let conversionRate: number;
    
    switch (cryptoToken) {
      case 'USDC':
        cryptoAmount = usdAmount; // 1 USD = 1 USDC
        conversionRate = 1;
        break;
      case 'USDT':
        cryptoAmount = usdAmount; // 1 USD ≈ 1 USDT
        conversionRate = 1;
        break;
      case 'ETH':
        // Get ETH price from CoinGecko
        try {
          const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
          const ethData = await ethResponse.json();
          const ethPrice = ethData.ethereum?.usd || 3000; // Fallback price
          cryptoAmount = usdAmount / ethPrice;
          conversionRate = ethPrice;
        } catch {
          cryptoAmount = usdAmount / 3000; // Fallback
          conversionRate = 3000;
        }
        break;
      case 'BTC':
        // Get BTC price from CoinGecko
        try {
          const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
          const btcData = await btcResponse.json();
          const btcPrice = btcData.bitcoin?.usd || 50000; // Fallback price
          cryptoAmount = usdAmount / btcPrice;
          conversionRate = btcPrice;
        } catch {
          cryptoAmount = usdAmount / 50000; // Fallback
          conversionRate = 50000;
        }
        break;
      default:
        cryptoAmount = usdAmount;
        conversionRate = 1;
    }

    // Final validation: Ensure crypto amount is reasonable
    if (fiatCurrency === 'KES' && fiatAmount > 0) {
      const expectedMaxUsdc = fiatAmount / 150; // 1 USDC ≈ 150 KES
      if (cryptoAmount > expectedMaxUsdc * 2) { // Allow 2x margin for rate fluctuations
        throw new Error(`Unrealistic conversion: ${fiatAmount} KES = ${cryptoAmount} USDC. Expected max: ${expectedMaxUsdc.toFixed(2)} USDC`);
      }
    }

    return {
      fiatAmount,
      fiatCurrency,
      cryptoAmount: Number(cryptoAmount.toFixed(6)),
      cryptoToken,
      conversionRate
    };
  }

  // Convert crypto amount to fiat amount
  async convertCryptoToFiat(
    cryptoAmount: number,
    cryptoToken: string,
    targetCurrency: 'KES' | 'USD'
  ): Promise<{ fiatAmount: number; fiatCurrency: 'KES' | 'USD' }> {
    const rates = await this.getConversionRates();
    
    let usdAmount: number;
    let conversionRate: number;
    
    switch (cryptoToken) {
      case 'USDC':
        usdAmount = cryptoAmount;
        conversionRate = 1;
        break;
      case 'USDT':
        usdAmount = cryptoAmount;
        conversionRate = 1;
        break;
      case 'ETH':
        try {
          const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
          const ethData = await ethResponse.json();
          const ethPrice = ethData.ethereum?.usd || 3000;
          usdAmount = cryptoAmount * ethPrice;
          conversionRate = ethPrice;
        } catch {
          usdAmount = cryptoAmount * 3000;
          conversionRate = 3000;
        }
        break;
      case 'BTC':
        try {
          const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
          const btcData = await btcResponse.json();
          const btcPrice = btcData.bitcoin?.usd || 50000;
          usdAmount = cryptoAmount * btcPrice;
          conversionRate = btcPrice;
        } catch {
          usdAmount = cryptoAmount * 50000;
          conversionRate = 50000;
        }
        break;
      default:
        usdAmount = cryptoAmount;
        conversionRate = 1;
    }

    if (targetCurrency === 'KES') {
      return {
        fiatAmount: Number((usdAmount / rates.kes).toFixed(2)),
        fiatCurrency: 'KES'
      };
    } else {
      return {
        fiatAmount: Number(usdAmount.toFixed(2)),
        fiatCurrency: 'USD'
      };
    }
  }

  // Get current market prices
  async getMarketPrices(): Promise<Record<string, { usd: number; kes: number }>> {
    const rates = await this.getConversionRates();
    
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether,ethereum,bitcoin&vs_currencies=usd');
      const data = await response.json();
      
      return {
        'USDC': { usd: data['usd-coin']?.usd || 1, kes: (data['usd-coin']?.usd || 1) / rates.kes },
        'USDT': { usd: data.tether?.usd || 1, kes: (data.tether?.usd || 1) / rates.kes },
        'ETH': { usd: data.ethereum?.usd || 3000, kes: (data.ethereum?.usd || 3000) / rates.kes },
        'BTC': { usd: data.bitcoin?.usd || 50000, kes: (data.bitcoin?.usd || 50000) / rates.kes }
      };
    } catch (error) {
      console.error('Failed to fetch market prices:', error);
      
      // Fallback prices
      return {
        'USDC': { usd: 1, kes: 1 / rates.kes },
        'USDT': { usd: 1, kes: 1 / rates.kes },
        'ETH': { usd: 3000, kes: 3000 / rates.kes },
        'BTC': { usd: 50000, kes: 50000 / rates.kes }
      };
    }
  }

  // Test conversion function to verify rates are correct
  async testConversion(): Promise<void> {
    try {
      console.log('🧪 Testing conversion rates...');
      
      const rates = await this.getConversionRates();
      console.log('Current rates:', rates);
      
      // Test KES to USD conversion
      const testKesAmount = 1000;
      const testUsdAmount = testKesAmount * rates.kes;
      const backToKes = testUsdAmount / rates.kes;
      
      console.log(`Test: ${testKesAmount} KES = ${testUsdAmount.toFixed(2)} USD`);
      console.log(`Reverse: ${testUsdAmount.toFixed(2)} USD = ${backToKes.toFixed(2)} KES`);
      
      // Test should be within 0.01% accuracy
      const accuracy = Math.abs(backToKes - testKesAmount) / testKesAmount;
      if (accuracy > 0.0001) {
        console.error(`❌ Conversion accuracy error: ${(accuracy * 100).toFixed(4)}%`);
      } else {
        console.log(`✅ Conversion accuracy: ${(accuracy * 100).toFixed(4)}%`);
      }
      
      // Test realistic conversion
      const testConversion = await this.convertFiatToCrypto(1000, 'KES', 'USDC');
      console.log('1000 KES conversion:', testConversion);
      
      // Should be roughly 6-7 USDC (1000 KES ≈ $6-7)
      if (testConversion.cryptoAmount < 5 || testConversion.cryptoAmount > 10) {
        console.error(`❌ Unrealistic conversion: 1000 KES = ${testConversion.cryptoAmount} USDC`);
      } else {
        console.log(`✅ Realistic conversion: 1000 KES = ${testConversion.cryptoAmount} USDC`);
      }
      
    } catch (error) {
      console.error('❌ Conversion test failed:', error);
    }
  }
}

export const cryptoConverter = new CryptoConverter();
