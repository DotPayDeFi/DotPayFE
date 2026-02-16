import { MpesaTransaction } from "@/types/mpesa";

function formatFixed(value: number | null | undefined, decimals: number): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return Number(0).toFixed(decimals);
  return n.toFixed(decimals);
}

function targetDescriptor(tx: MpesaTransaction): string {
  if (tx.flowType === "offramp") return `phone:${tx.targets?.phoneNumber || "-"}`;
  if (tx.flowType === "paybill") {
    return `paybill:${tx.targets?.paybillNumber || "-"}:${tx.targets?.accountReference || "-"}`;
  }
  if (tx.flowType === "buygoods") {
    return `buygoods:${tx.targets?.tillNumber || "-"}:${tx.targets?.accountReference || "DotPay"}`;
  }
  return "onramp";
}

export function buildMpesaAuthorizationMessage({
  tx,
  signedAt,
  nonce,
}: {
  tx: MpesaTransaction;
  signedAt: string;
  nonce: string;
}): string {
  return [
    "DotPay Authorization",
    `Transaction: ${tx.transactionId}`,
    `Flow: ${tx.flowType}`,
    `Quote: ${tx.quote?.quoteId || "-"}`,
    `AmountKES: ${formatFixed(tx.quote?.totalDebitKes || tx.quote?.amountKes || 0, 2)}`,
    `AmountUSDC: ${formatFixed(tx.onchain?.expectedAmountUsd || tx.quote?.amountUsd || 0, 6)}`,
    `Target: ${targetDescriptor(tx)}`,
    `Nonce: ${nonce}`,
    `SignedAt: ${signedAt}`,
  ].join("\n");
}
