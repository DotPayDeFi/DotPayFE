"use client";

import { useQuery } from "@tanstack/react-query";

export type OnchainTransfer = {
  hash: string;
  timeStamp: number;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: number;
};

export type OnchainActivityResponse = {
  success: boolean;
  message: string;
  data: { transfers: OnchainTransfer[] };
};

export function useOnchainActivity(params: {
  address: string | null;
  network: "mainnet" | "sepolia";
  limit?: number;
}) {
  const { address, network, limit = 8 } = params;

  return useQuery<OnchainTransfer[]>({
    queryKey: ["onchain-activity", network, address, limit],
    enabled: Boolean(address),
    queryFn: async () => {
      if (!address) return [];
      const url = `/api/activity?address=${encodeURIComponent(address)}&network=${encodeURIComponent(
        network
      )}&limit=${encodeURIComponent(String(limit))}`;
      const res = await fetch(url, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as OnchainActivityResponse | null;
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to load activity.");
      }
      if (!payload?.success) {
        // Treat "success=false" as an error so UI can show a retry.
        throw new Error(payload?.message || "Failed to load activity.");
      }
      return Array.isArray(payload.data?.transfers) ? payload.data.transfers : [];
    },
    staleTime: 30 * 1000,
    retry: 1,
  });
}

