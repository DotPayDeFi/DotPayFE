"use client";

import { useQuery } from "@tanstack/react-query";
import { cryptoConverter } from "@/lib/crypto-converter";

type KesRate = {
  /** KES per 1 USD (e.g. 155.23). */
  kesPerUsd: number;
  fetchedAt: number;
};

export function useKesRate() {
  return useQuery<KesRate>({
    queryKey: ["fx", "USD", "KES"],
    queryFn: async () => {
      const rates = await cryptoConverter.getConversionRates();
      const kesPerUsd = 1 / rates.kes;

      if (!Number.isFinite(kesPerUsd) || kesPerUsd <= 0) {
        throw new Error(`Invalid KES rate: ${kesPerUsd}`);
      }

      return { kesPerUsd, fetchedAt: Date.now() };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

