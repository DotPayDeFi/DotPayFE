"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type NotificationItem = {
  id: string;
  toAddress: string;
  fromAddress: string;
  type: "payment_received";
  chainId: number;
  contractAddress: string;
  txHash: string;
  logIndex: number;
  value: string;
  tokenSymbol: string;
  tokenDecimal: number;
  note: string | null;
  eventAt: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsResponse = {
  success: boolean;
  message?: string;
  data: {
    notifications: NotificationItem[];
    unreadCount: number;
    nextCursor: string | null;
  };
};

export function useNotifications(params?: { limit?: number; before?: string | null; enabled?: boolean }) {
  const limit = params?.limit ?? 20;
  const before = params?.before ?? null;
  const enabled = params?.enabled ?? true;

  return useQuery({
    queryKey: ["notifications", limit, before],
    enabled,
    queryFn: async () => {
      const url = new URL("/api/notifications", window.location.origin);
      url.searchParams.set("limit", String(limit));
      if (before) url.searchParams.set("before", before);

      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as NotificationsResponse | null;

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to load notifications.");
      }

      return payload.data;
    },
    staleTime: 15 * 1000,
    retry: 1,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST", cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to mark notifications as read.");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to mark notification as read.");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
