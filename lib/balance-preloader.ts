import axios from 'axios';
import { getApiBaseUrl } from './config';

// Balance preloader service for immediate data loading after login
export class BalancePreloader {
  private static instance: BalancePreloader;
  private api: any;
  private cache: Map<string, any> = new Map();
  private preloadPromise: Promise<any> | null = null;

  private constructor() {
    // Initialize API instance with axios directly
    this.api = axios.create({
      baseURL: getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config: any) => {
        const token = localStorage.getItem('dotpay_token') || localStorage.getItem('user');
        if (token) {
          try {
            const parsedToken = token.startsWith('{') ? JSON.parse(token)?.data?.token || JSON.parse(token)?.token : token;
            if (parsedToken) {
              config.headers.Authorization = `Bearer ${parsedToken}`;
            }
          } catch (error) {
            console.error('Error parsing token:', error);
          }
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): BalancePreloader {
    if (!BalancePreloader.instance) {
      BalancePreloader.instance = new BalancePreloader();
    }
    return BalancePreloader.instance;
  }

  // Preload balance data immediately after login
  public async preloadBalance(): Promise<any> {
    // Prevent multiple simultaneous preloads
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = this._fetchBalance();
    return this.preloadPromise;
  }

  private async _fetchBalance(): Promise<any> {
    try {
      console.log('🔄 Preloading balance data...');
      const startTime = Date.now();
      
      const response = await this.api.get('/token/balance');
      
      if (response.data.success) {
        const balanceData = response.data.data;
        
        // Cache the data immediately
        this.cache.set('balance', balanceData);
        this.cache.set('balance_timestamp', Date.now());
        
        // Also store in localStorage for persistence
        try {
          const cacheData = {
            data: balanceData,
            timestamp: Date.now()
          };
          localStorage.setItem('dotpay_balance_cache', JSON.stringify(cacheData));
        } catch (error) {
          console.error('Error caching balance in localStorage:', error);
        }
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ Balance preloaded in ${loadTime}ms`);
        
        return balanceData;
      } else {
        console.error('❌ Balance preload failed:', response.data.message);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Balance preload error:', error);
      return null;
    } finally {
      this.preloadPromise = null;
    }
  }

  // Get cached balance data
  public getCachedBalance(): any {
    const timestamp = this.cache.get('balance_timestamp');
    const now = Date.now();
    
    // Check if cache is still valid (5 minutes)
    if (timestamp && (now - timestamp) < 5 * 60 * 1000) {
      return this.cache.get('balance');
    }
    
    return null;
  }

  // Clear cache
  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('dotpay_balance_cache');
  }

  // Check if preload is in progress
  public isPreloading(): boolean {
    return this.preloadPromise !== null;
  }
}

// Utility function to preload balance after login
export const preloadBalanceAfterLogin = async (): Promise<void> => {
  try {
    const preloader = BalancePreloader.getInstance();
    await preloader.preloadBalance();
  } catch (error) {
    console.error('Failed to preload balance after login:', error);
  }
};

// Utility function to get cached balance
export const getCachedBalanceData = (): any => {
  const preloader = BalancePreloader.getInstance();
  return preloader.getCachedBalance();
};
