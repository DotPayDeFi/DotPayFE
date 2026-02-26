import {
  CreateMpesaQuotePayload,
  InitiateBuygoodsPayload,
  InitiateOfframpPayload,
  InitiateOnrampPayload,
  InitiatePaybillPayload,
  LiquidityPrecheckPayload,
  LiquidityPrecheckResult,
  MpesaApiEnvelope,
  MpesaTransaction,
  PlatformLiquidityState,
} from "@/types/mpesa";

function toJson<T>(input: string): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return {} as T;
  }
}

function createIdempotencyKey(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${rand}`;
}

function extractBodyAndIdempotency<T extends Record<string, unknown>>(
  payload: T,
  prefix: string
): { body: Record<string, unknown>; idempotencyKey: string } {
  const clone = { ...payload } as Record<string, unknown>;
  const provided = String(clone.idempotencyKey || "").trim();
  delete clone.idempotencyKey;

  return {
    body: clone,
    idempotencyKey: provided || createIdempotencyKey(prefix),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/mpesa/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = toJson<any>(text || "{}");
  if (!response.ok || !payload?.success) {
    const message = payload?.message || "M-Pesa request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export const mpesaClient = {
  createQuote: async (payload: CreateMpesaQuotePayload): Promise<MpesaApiEnvelope<{ quote: MpesaTransaction["quote"]; transaction: MpesaTransaction }>> => {
    return request("quotes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  initiateOnrampStk: async (payload: InitiateOnrampPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    const { body, idempotencyKey } = extractBodyAndIdempotency(
      payload as unknown as Record<string, unknown>,
      "onramp"
    );
    return request("onramp/stk/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
  },

  initiateOfframp: async (payload: InitiateOfframpPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    const { body, idempotencyKey } = extractBodyAndIdempotency(
      payload as unknown as Record<string, unknown>,
      "offramp"
    );
    return request("offramp/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
  },

  initiatePaybill: async (payload: InitiatePaybillPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    const { body, idempotencyKey } = extractBodyAndIdempotency(
      payload as unknown as Record<string, unknown>,
      "paybill"
    );
    return request("merchant/paybill/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
  },

  initiateBuygoods: async (payload: InitiateBuygoodsPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    const { body, idempotencyKey } = extractBodyAndIdempotency(
      payload as unknown as Record<string, unknown>,
      "buygoods"
    );
    return request("merchant/buygoods/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
  },

  getTransaction: async (transactionId: string): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    return request(`transactions/${encodeURIComponent(transactionId)}`);
  },

  listTransactions: async (filters: { flowType?: string; status?: string; limit?: number } = {}): Promise<MpesaApiEnvelope<{ transactions: MpesaTransaction[] }>> => {
    const params = new URLSearchParams();
    if (filters.flowType) params.set("flowType", filters.flowType);
    if (filters.status) params.set("status", filters.status);
    if (filters.limit) params.set("limit", String(filters.limit));
    const query = params.toString();
    return request(`transactions${query ? `?${query}` : ""}`);
  },

  getLiquidityState: async (forceRefresh = false): Promise<MpesaApiEnvelope<PlatformLiquidityState>> => {
    const query = forceRefresh ? "?force=true" : "";
    return request(`liquidity/state${query}`);
  },

  precheckLiquidity: async (
    payload: LiquidityPrecheckPayload
  ): Promise<MpesaApiEnvelope<LiquidityPrecheckResult>> => {
    return request("liquidity/precheck", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
