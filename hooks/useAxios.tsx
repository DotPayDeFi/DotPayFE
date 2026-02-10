/**
 * useAxios Hook - STUBBED OUT
 * This hook has been stubbed out for dummy frontend mode.
 * Returns a mock axios instance that simulates API calls.
 */

import { createMockResponse, simulateDelay } from '../lib/mock-data';

const useAxios = () => {
  const $http = {
    get: async (url: string) => {
      await simulateDelay(300);
      return { data: createMockResponse({}, 'Mock GET response') };
    },
    post: async (url: string, data?: any) => {
      await simulateDelay(300);
      return { data: createMockResponse({}, 'Mock POST response') };
    },
    put: async (url: string, data?: any) => {
      await simulateDelay(300);
      return { data: createMockResponse({}, 'Mock PUT response') };
    },
    delete: async (url: string) => {
      await simulateDelay(300);
      return { data: createMockResponse({}, 'Mock DELETE response') };
    },
    interceptors: {
      request: { use: () => {} },
      response: { use: () => {} },
    },
  };

  return $http;
};

export default useAxios;
