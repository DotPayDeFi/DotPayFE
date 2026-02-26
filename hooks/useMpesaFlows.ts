"use client";

import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mpesaClient } from "@/lib/mpesa-client";
import {
  CreateMpesaQuotePayload,
  InitiateBuygoodsPayload,
  InitiateOfframpPayload,
  InitiateOnrampPayload,
  InitiatePaybillPayload,
  LiquidityPrecheckPayload,
  PlatformLiquidityState,
  MpesaTransaction,
  MpesaTransactionStatus,
} from "@/types/mpesa";

const TERMINAL_STATUSES: MpesaTransactionStatus[] = ["succeeded", "failed", "refunded"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useMpesaFlows() {
  const queryClient = useQueryClient();
  const pollingRef = useRef<Record<string, boolean>>({});

  const createQuoteMutation = useMutation({
    mutationFn: (payload: CreateMpesaQuotePayload) => mpesaClient.createQuote(payload),
  });

  const onrampMutation = useMutation({
    mutationFn: (payload: InitiateOnrampPayload) => mpesaClient.initiateOnrampStk(payload),
  });

  const offrampMutation = useMutation({
    mutationFn: (payload: InitiateOfframpPayload) => mpesaClient.initiateOfframp(payload),
  });

  const paybillMutation = useMutation({
    mutationFn: (payload: InitiatePaybillPayload) => mpesaClient.initiatePaybill(payload),
  });

  const buygoodsMutation = useMutation({
    mutationFn: (payload: InitiateBuygoodsPayload) => mpesaClient.initiateBuygoods(payload),
  });

  const getTransaction = useCallback(async (transactionId: string) => {
    const data = await mpesaClient.getTransaction(transactionId);
    queryClient.setQueryData(["mpesa", "transaction", transactionId], data.data);
    return data.data;
  }, [queryClient]);

  const precheckLiquidity = useCallback(async (payload: LiquidityPrecheckPayload) => {
    const data = await mpesaClient.precheckLiquidity(payload);
    return data.data;
  }, []);

  const getLiquidityState = useCallback(async (forceRefresh = false): Promise<PlatformLiquidityState> => {
    const data = await mpesaClient.getLiquidityState(forceRefresh);
    queryClient.setQueryData(["mpesa", "liquidity"], data.data);
    return data.data;
  }, [queryClient]);

  const pollTransaction = useCallback(
    async (
      transactionId: string,
      options?: {
        intervalMs?: number;
        timeoutMs?: number;
        onUpdate?: (tx: MpesaTransaction) => void;
      }
    ) => {
      const intervalMs = options?.intervalMs ?? 3500;
      const timeoutMs = options?.timeoutMs ?? 2 * 60 * 1000;
      const startedAt = Date.now();
      pollingRef.current[transactionId] = true;

      while (pollingRef.current[transactionId]) {
        const tx = await getTransaction(transactionId);
        if (options?.onUpdate) options.onUpdate(tx);

        if (TERMINAL_STATUSES.includes(tx.status)) {
          pollingRef.current[transactionId] = false;
          return tx;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          pollingRef.current[transactionId] = false;
          return tx;
        }

        await sleep(intervalMs);
      }

      return getTransaction(transactionId);
    },
    [getTransaction]
  );

  const stopPolling = useCallback((transactionId: string) => {
    pollingRef.current[transactionId] = false;
  }, []);

  return {
    createQuote: createQuoteMutation.mutateAsync,
    createQuoteState: createQuoteMutation,

    initiateOnrampStk: onrampMutation.mutateAsync,
    onrampState: onrampMutation,

    initiateOfframp: offrampMutation.mutateAsync,
    offrampState: offrampMutation,

    initiatePaybill: paybillMutation.mutateAsync,
    paybillState: paybillMutation,

    initiateBuygoods: buygoodsMutation.mutateAsync,
    buygoodsState: buygoodsMutation,

    getTransaction,
    precheckLiquidity,
    getLiquidityState,
    pollTransaction,
    stopPolling,
  };
}
