import { formatKsh, formatUsd } from "@/lib/format";
import type { MpesaFlowType, MpesaTransaction, MpesaTransactionStatus } from "@/types/mpesa";

const FLOW_LABELS: Record<MpesaFlowType, string> = {
  onramp: "Top up",
  offramp: "Cash out",
  paybill: "PayBill",
  buygoods: "Till payment",
};

const STATUS_LABELS: Record<MpesaTransactionStatus, string> = {
  created: "Created",
  quoted: "Quote created",
  awaiting_user_authorization: "Approved in DotPay",
  awaiting_onchain_funding: "Processing payment",
  mpesa_submitted: "Sent request to M-Pesa",
  mpesa_processing: "Waiting for M-Pesa confirmation",
  succeeded: "Succeeded",
  failed: "Failed",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export function mpesaFlowLabel(flowType: MpesaFlowType | string | null | undefined) {
  const key = String(flowType || "").trim() as MpesaFlowType;
  return FLOW_LABELS[key] || "Payment";
}

export function mpesaStatusLabel(status: MpesaTransactionStatus | string | null | undefined) {
  const key = String(status || "").trim() as MpesaTransactionStatus;
  return STATUS_LABELS[key] || (key ? key.replace(/_/g, " ") : "Unknown");
}

export function mpesaTimelineLabel(status: MpesaTransactionStatus | string | null | undefined) {
  return mpesaStatusLabel(status);
}

export function formatReceiptDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function maskPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  if (!digits) return "-";
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export function mpesaResultCode(tx: MpesaTransaction) {
  const value = tx.daraja.resultCode ?? tx.daraja.resultCodeRaw;
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

export function mpesaTargetLines(
  tx: MpesaTransaction,
  options?: { maskPhoneNumber?: boolean }
) {
  const lines: string[] = [];
  const phone = options?.maskPhoneNumber
    ? maskPhone(tx.targets.phoneNumber || null)
    : tx.targets.phoneNumber || null;

  if (phone && phone !== "-") {
    lines.push(`Phone: ${phone}`);
  }
  if (tx.targets.paybillNumber) {
    lines.push(`PayBill: ${tx.targets.paybillNumber}`);
  }
  if (tx.targets.tillNumber) {
    lines.push(`Till: ${tx.targets.tillNumber}`);
  }
  if (tx.targets.accountReference) {
    lines.push(`Reference: ${tx.targets.accountReference}`);
  }
  return lines;
}

export function buildMpesaShareText(
  tx: MpesaTransaction,
  options?: { maskPhoneNumber?: boolean }
) {
  const lines: string[] = [];
  lines.push("DotPay receipt");
  lines.push(`Type: ${mpesaFlowLabel(tx.flowType)}`);
  lines.push(`Status: ${mpesaStatusLabel(tx.status)}`);
  lines.push(`Amount: ${formatKsh(tx.quote.totalDebitKes, { maximumFractionDigits: 2 })}`);

  if (tx.flowType === "onramp") {
    lines.push(`Wallet credit: ${formatKsh(tx.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}`);
    lines.push(`USD credit: ${formatUsd(tx.quote.amountUsd, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`);
  } else {
    lines.push(`M-Pesa amount: ${formatKsh(tx.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}`);
  }

  lines.push(...mpesaTargetLines(tx, options));
  lines.push(`M-Pesa receipt: ${tx.daraja.receiptNumber || "-"}`);
  lines.push(`Result code: ${mpesaResultCode(tx)}`);
  lines.push(`Result: ${tx.daraja.resultDesc || "-"}`);
  lines.push(`Transaction ID: ${tx.transactionId}`);
  lines.push(`Updated: ${formatReceiptDateTime(tx.updatedAt || tx.createdAt)}`);

  return lines.filter(Boolean).join("\n");
}
