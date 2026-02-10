// import { useQuery } from "@tanstack/react-query";
// import useAxios from "./useAxios";
// import { Transaction } from "@/types/api-types";

// interface ApiHookResponse<T> {
//   data: T;
//   isLoading: boolean;
//   error: unknown;
// }

// export function useGetConversionRate(): ApiHookResponse<number> {
//   const api = useAxios();
//   const { isLoading, data, error } = useQuery({
//     queryKey: ["getConversionRate"],
//     queryFn: () =>
//       api.get("usdc/conversionrate").then((res) => {
//         // console.log(res);
//         return res.data.rate;
//       }),
//   });
//   return { isLoading, data, error };
// }

// export function useGetBalanceHook(): ApiHookResponse<number> {
//   const api = useAxios();
//   const user = JSON.parse(localStorage.getItem("user") ?? "");
//   const { isLoading, data, error } = useQuery({
//     queryKey: ["getUserBalance"],
//     queryFn: () =>
//       api.get(`usdc/usdc-balance/${user.walletAddress}`).then((res) => {
//         return res.data;
//       }),
//   });
//   return { isLoading, data, error };
// }

// export function useGetTransactions(): ApiHookResponse<Transaction[]> {
//   const api = useAxios();
//   const user = JSON.parse(localStorage.getItem("user"));
//   const { isLoading, data, error } = useQuery({
//     queryKey: ["getUserTransactions"],
//     queryFn: () =>
//       api.get(`token/token-transfer-events?address=${user.data.walletAddress}`).then((res) => {
//         return res.data;
//       }),
//   });
//   return { isLoading, data, error };
// }


import { useQuery } from "@tanstack/react-query";
import useAxios from "./useAxios";
import { Transaction } from "@/types/api-types";
import { useChain } from "@/context/ChainContext";
import { cryptoConverter } from "@/lib/crypto-converter";

interface ApiHookResponse<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
}

export function useGetConversionRate(): ApiHookResponse<number> {
  const api = useAxios();
  const { isLoading, data, error } = useQuery({
    queryKey: ["getConversionRate"],
    queryFn: async () => {
      try {
        // First try to get rate from backend
        const res = await api.get("usdc/conversionrate");
        return res.data.rate;
      } catch (backendError) {
        console.log('Backend conversion rate endpoint not available, using crypto converter...');
        
        // Fallback to crypto converter
        try {
          const rates = await cryptoConverter.getConversionRates();
          // Return KES per USD rate (e.g., 129.23 KES = 1 USD)
          return 1 / rates.kes;
        } catch (converterError) {
          console.error('Both backend and crypto converter failed:', converterError);
          throw converterError;
        }
      }
    },
    retry: 1, // Only retry once since we have fallback
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  return { isLoading, data, error };
}

export function useGetBalanceHook(): ApiHookResponse<number> {
  const api = useAxios();
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const { isLoading, data, error } = useQuery({
    queryKey: ["getUserBalance"],
    queryFn: () =>
      api.get(`usdc/usdc-balance/${user?.walletAddress}`).then((res) => {
        return res.data;
      }),
    enabled: !!user, // Only run query if user is not null
  });
  return { isLoading, data, error };
}

export function useGetTransactions(): ApiHookResponse<Transaction[]> {
  const api = useAxios();
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const { chain } = useChain(); // Use the chain from the ChainContext

  // Determine the correct wallet address based on the selected chain
  const walletAddress = chain === "arbitrum"
    ? user?.data.arbitrumWallet
    : chain === "celo"
    ? user?.data.celoWallet
    : null;

  const { isLoading, data, error } = useQuery({
    queryKey: ["getUserTransactions", chain],
    queryFn: () =>
      api
        .get(`token/token-transfer-events?address=${walletAddress}&chain=${chain}`)
        .then((res) => {
          return res.data;
        }),
    enabled: !!user && !!chain && !!walletAddress, // Only run query if user, chain, and walletAddress are not null
  });

  return { isLoading, data, error };
}
