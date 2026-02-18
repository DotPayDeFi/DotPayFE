export type MpesaFlowType = "onramp" | "offramp" | "paybill" | "buygoods";

export type MpesaTransactionStatus =
  | "created"
  | "quoted"
  | "awaiting_user_authorization"
  | "awaiting_onchain_funding"
  | "mpesa_submitted"
  | "mpesa_processing"
  | "succeeded"
  | "failed"
  | "refund_pending"
  | "refunded";

export type MpesaQuote = {
  quoteId: string;
  currency: "KES" | "USD";
  amountRequested: number;
  amountKes: number;
  amountUsd: number;
  rateKesPerUsd: number;
  feeAmountKes: number;
  networkFeeKes: number;
  totalDebitKes: number;
  expectedReceiveKes: number;
  expiresAt: string;
  snapshotAt: string;
};

export type MpesaTargets = {
  phoneNumber?: string | null;
  paybillNumber?: string | null;
  tillNumber?: string | null;
  accountReference?: string | null;
};

export type MpesaDarajaDetails = {
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  conversationId: string | null;
  originatorConversationId: string | null;
  responseCode: string | null;
  responseDescription: string | null;
  resultCode: number | null;
  resultCodeRaw: string | null;
  resultDesc: string | null;
  receiptNumber: string | null;
  customerMessage: string | null;
  callbackReceivedAt: string | null;
};

export type MpesaRefund = {
  status: "none" | "pending" | "completed" | "failed";
  reason: string | null;
  txHash: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
};

export type MpesaHistoryItem = {
  from: string | null;
  to: MpesaTransactionStatus;
  reason: string | null;
  source: string;
  at: string;
};

export type MpesaTransaction = {
  transactionId: string;
  flowType: MpesaFlowType;
  status: MpesaTransactionStatus;
  quote: MpesaQuote;
  targets: MpesaTargets;
  onchain?: {
    txHash: string | null;
    chainId: number | null;
    required?: boolean;
    verificationStatus?: "not_required" | "pending" | "verified" | "failed";
    tokenAddress?: string | null;
    tokenSymbol?: string | null;
    treasuryAddress?: string | null;
    expectedAmountUsd?: number;
    expectedAmountUnits?: string | null;
    fundedAmountUsd?: number;
    fundedAmountUnits?: string | null;
    fromAddress?: string | null;
    toAddress?: string | null;
    logIndex?: number | null;
    verificationError?: string | null;
    verifiedBy?: string | null;
    verifiedAt: string | null;
  };
  daraja: MpesaDarajaDetails;
  refund: MpesaRefund;
  history: MpesaHistoryItem[];
  businessId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MpesaApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  idempotent?: boolean;
};

export type CreateMpesaQuotePayload = {
  flowType: MpesaFlowType;
  amount: number;
  currency?: "KES" | "USD";
  phoneNumber?: string;
  paybillNumber?: string;
  tillNumber?: string;
  accountReference?: string;
  businessId?: string;
};

export type InitiateOnrampPayload = {
  idempotencyKey?: string;
  quoteId?: string;
  amount?: number;
  currency?: "KES" | "USD";
  phoneNumber: string;
  businessId?: string;
};

export type InitiateOfframpPayload = {
  idempotencyKey?: string;
  quoteId?: string;
  amount?: number;
  currency?: "KES" | "USD";
  phoneNumber: string;
  pin: string;
  signature: string;
  signedAt?: string;
  nonce?: string;
  onchainTxHash?: string;
  chainId?: number;
  businessId?: string;
};

export type InitiatePaybillPayload = {
  idempotencyKey?: string;
  quoteId?: string;
  amount?: number;
  currency?: "KES" | "USD";
  paybillNumber: string;
  accountReference: string;
  pin: string;
  signature: string;
  signedAt?: string;
  nonce?: string;
  onchainTxHash?: string;
  chainId?: number;
  businessId?: string;
};

export type InitiateBuygoodsPayload = {
  idempotencyKey?: string;
  quoteId?: string;
  amount?: number;
  currency?: "KES" | "USD";
  tillNumber: string;
  accountReference?: string;
  pin: string;
  signature: string;
  signedAt?: string;
  nonce?: string;
  onchainTxHash?: string;
  chainId?: number;
  businessId?: string;
};
