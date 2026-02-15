import {
  CreateMpesaQuotePayload,
  InitiateBuygoodsPayload,
  InitiateOfframpPayload,
  InitiateOnrampPayload,
  InitiatePaybillPayload,
  MpesaApiEnvelope,
  MpesaTransaction,
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
    return request("onramp/stk/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": createIdempotencyKey("onramp"),
      },
      body: JSON.stringify(payload),
    });
  },

  initiateOfframp: async (payload: InitiateOfframpPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    return request("offramp/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": createIdempotencyKey("offramp"),
      },
      body: JSON.stringify(payload),
    });
  },

  initiatePaybill: async (payload: InitiatePaybillPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    return request("merchant/paybill/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": createIdempotencyKey("paybill"),
      },
      body: JSON.stringify(payload),
    });
  },

  initiateBuygoods: async (payload: InitiateBuygoodsPayload): Promise<MpesaApiEnvelope<MpesaTransaction>> => {
    return request("merchant/buygoods/initiate", {
      method: "POST",
      headers: {
        "Idempotency-Key": createIdempotencyKey("buygoods"),
      },
      body: JSON.stringify(payload),
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
};
