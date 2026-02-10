/**
 * API Configuration - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All API URLs are now mock endpoints.
 */

export const getApiBaseUrl = (): string => {
  return '/api/mock';
};

export const getApiBaseUrlWithoutPath = (): string => {
  return '';
};

export const getApiUrl = (endpoint: string): string => {
  return `/api/mock${endpoint}`;
};

export const API_CONFIG = {
  BASE_URL: '/api/mock',
  BASE_URL_WITHOUT_PATH: '',
  PRODUCTION_URL: '/api/mock',
  DEVELOPMENT_URL: '/api/mock',
} as const;
