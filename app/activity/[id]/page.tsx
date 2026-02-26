"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Share2 } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DetailsDisclosure } from "@/components/ui/DetailsDisclosure";
import { formatKsh, shortHash } from "@/lib/format";
import { getDotPayNetwork } from "@/lib/dotpayNetwork";
import { mpesaClient } from "@/lib/mpesa-client";
import {
  buildMpesaShareText,
  formatReceiptDateTime,
  maskPhone,
  mpesaFlowLabel,
  mpesaResultCode,
  mpesaStatusLabel,
  mpesaTimelineLabel,
} from "@/lib/receipt";
import { MpesaTransaction } from "@/types/mpesa";
import type { OnchainTransfer } from "@/hooks/useOnchainActivity";

function isTxHash(id: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(id);
}

function explorerUrl(txHash: string, network: "mainnet" | "sepolia") {
  return network === "sepolia"
    ? `https://sepolia.arbiscan.io/tx/${txHash}`
    : `https://arbiscan.io/tx/${txHash}`;
}

function unitsToNumber(value: string, decimals: number): number | null {
  const clean = String(value || "0").trim().replace(/^0+/, "") || "0";
  const d = Number.isFinite(decimals) ? Math.max(0, Math.min(decimals, 18)) : 6;
  const padded = clean.padStart(d + 1, "0");
  const intPart = padded.slice(0, -d);
  const fracPartRaw = padded.slice(-d);
  const fracPart = fracPartRaw.replace(/0+$/, "");
  const numStr = fracPart.length ? `${intPart}.${fracPart}` : intPart;
  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

function formatTokenAmount(value: number | null, symbol: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return `${symbol} —`;
  const shown = value.toFixed(6).replace(/\.?0+$/, "");
  return `${shown} ${symbol}`;
}

function receiptStatusClasses(status: MpesaTransaction["status"]) {
  if (status === "succeeded") return "border-cyan-300/25 bg-cyan-500/10 text-cyan-100";
  if (status === "failed") return "border-red-300/25 bg-red-500/10 text-red-100";
  if (status === "refunded") return "border-white/20 bg-white/10 text-white/85";
  return "border-white/15 bg-white/5 text-white/75";
}

function receiptStatusIconClass(status: MpesaTransaction["status"]) {
  if (status === "succeeded") return "text-cyan-300";
  if (status === "failed") return "text-red-300";
  if (status === "refunded") return "text-white/85";
  return "text-white/75";
}

export default function ActivityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "").trim();
  const network = getDotPayNetwork();

  const [transferSnapshot, setTransferSnapshot] = useState<{
    transfer: OnchainTransfer;
    kesPerUsd?: number;
  } | null>(null);

  useEffect(() => {
    if (!id || !isTxHash(id)) return;
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(`activity:${id}`) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (parsed?.kind !== "transfer" || !parsed?.transfer) return;
      setTransferSnapshot({ transfer: parsed.transfer as OnchainTransfer, kesPerUsd: parsed.kesPerUsd });
    } catch {
      // ignore session storage errors
    }
  }, [id]);

  const mpesaQuery = useQuery<MpesaTransaction | null>({
    queryKey: ["mpesa", "transaction", id],
    enabled: Boolean(id) && !isTxHash(id),
    queryFn: async () => {
      const res = await mpesaClient.getTransaction(id);
      return res.data ?? null;
    },
    retry: 1,
  });

  const tx = mpesaQuery.data;

  const transferDetails = useMemo(() => {
    if (!transferSnapshot) return null;
    const transfer = transferSnapshot.transfer;
    const tokenSymbol = transfer.tokenSymbol || "USDC";
    const amountToken = unitsToNumber(transfer.value, transfer.tokenDecimal);
    const kesRate = typeof transferSnapshot.kesPerUsd === "number" ? transferSnapshot.kesPerUsd : 155;
    const amountKes = typeof amountToken === "number" ? amountToken * kesRate : null;
    const confirmedAt = transfer.timeStamp
      ? new Date(transfer.timeStamp * 1000).toISOString()
      : null;

    return {
      tokenSymbol,
      amountToken,
      amountKes,
      confirmedAt,
    };
  }, [transferSnapshot]);

  const shareReceipt = useCallback(async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "DotPay receipt", text });
        return;
      } catch {
        // ignore share cancellation
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Receipt copied");
    } catch {
      toast.error("Unable to share receipt");
    }
  }, []);

  const mpesaReceiptText = useMemo(() => {
    if (!tx) return null;
    return buildMpesaShareText(tx, { maskPhoneNumber: true });
  }, [tx]);

  const transferReceiptText = useMemo(() => {
    if (!transferSnapshot || !transferDetails) return null;
    const transfer = transferSnapshot.transfer;
    return [
      "DotPay receipt",
      "Type: Transfer",
      "Status: Completed",
      `Amount: ${typeof transferDetails.amountKes === "number" ? formatKsh(transferDetails.amountKes, { maximumFractionDigits: 2 }) : "KSh —"}`,
      `Token amount: ${formatTokenAmount(transferDetails.amountToken, transferDetails.tokenSymbol)}`,
      `From: ${transfer.from}`,
      `To: ${transfer.to}`,
      `Transaction hash: ${transfer.hash}`,
      `Confirmed: ${formatReceiptDateTime(transferDetails.confirmedAt)}`,
    ].join("\n");
  }, [transferDetails, transferSnapshot]);

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Copied");
    } catch {
      toast.error("Unable to copy");
    }
  }, [id]);

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 pb-8 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/activity")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                Copy ID
              </button>
              {isTxHash(id) && (
                <a
                  href={explorerUrl(id, network)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  Explorer
                </a>
              )}
            </div>
          </header>

          {isTxHash(id) ? (
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Transfer</p>
              <h1 className="mt-1 text-xl font-semibold">Transfer receipt</h1>
              <p className="mt-2 text-sm text-white/70">
                Network-confirmed transfer details.
              </p>

              {transferSnapshot ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                      <span className="font-semibold">On-chain transfer</span>
                    </div>
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                      Completed
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex justify-between">
                      <span>Amount (KSh)</span>
                      <strong>
                        {typeof transferDetails?.amountKes === "number"
                          ? formatKsh(transferDetails.amountKes, { maximumFractionDigits: 2 })
                          : "KSh —"}
                      </strong>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Token amount</span>
                      <span>{formatTokenAmount(transferDetails?.amountToken ?? null, transferDetails?.tokenSymbol || "USDC")}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>From</span>
                      <span className="font-mono">{shortHash(transferSnapshot.transfer.from, 4)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>To</span>
                      <span className="font-mono">{shortHash(transferSnapshot.transfer.to, 4)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Confirmed</span>
                      <span>{formatReceiptDateTime(transferDetails?.confirmedAt || null)}</span>
                    </div>
                  </div>

                  <DetailsDisclosure label="Details" className="bg-black/25">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Transaction hash</span>
                        <span className="font-mono break-all text-right text-white/80">{transferSnapshot.transfer.hash}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">From address</span>
                        <span className="font-mono break-all text-right text-white/80">{transferSnapshot.transfer.from}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">To address</span>
                        <span className="font-mono break-all text-right text-white/80">{transferSnapshot.transfer.to}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Block</span>
                        <span className="text-white/80">{transferSnapshot.transfer.blockNumber}</span>
                      </div>
                    </div>
                  </DetailsDisclosure>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => transferReceiptText && shareReceipt(transferReceiptText)}
                      disabled={!transferReceiptText}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                    >
                      <Share2 className="h-4 w-4" />
                      Share receipt
                    </button>
                    <a
                      href={explorerUrl(id, network)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25"
                    >
                      Explorer
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Opened from a direct link. Use Explorer for full network details.
                </div>
              )}
            </article>
          ) : (
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Receipt</p>
              <h1 className="mt-1 text-xl font-semibold">Payment details</h1>

              {mpesaQuery.isLoading && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Loading receipt…
                </div>
              )}

              {mpesaQuery.isError && (
                <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Receipt unavailable</p>
                  <p className="mt-1 text-xs text-amber-100/80">Try again or refresh later.</p>
                </div>
              )}

              {tx && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${receiptStatusIconClass(tx.status)}`} />
                      <span className="font-semibold">{mpesaFlowLabel(tx.flowType)}</span>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${receiptStatusClasses(tx.status)}`}
                    >
                      {mpesaStatusLabel(tx.status)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex justify-between">
                      <span>Total debit</span>
                      <strong>{formatKsh(tx.quote.totalDebitKes, { maximumFractionDigits: 2 })}</strong>
                    </div>
                    {tx.flowType === "onramp" ? (
                      <>
                        <div className="mt-1 flex justify-between text-white/70">
                          <span>Wallet credit</span>
                          <span>{formatKsh(tx.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-white/70">
                          <span>USD credit</span>
                          <span>{tx.quote.amountUsd.toFixed(6)} USD</span>
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 flex justify-between text-white/70">
                        <span>M-Pesa amount</span>
                        <span>{formatKsh(tx.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Fee</span>
                      <span>{formatKsh(tx.quote.feeAmountKes, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Network fee</span>
                      <span>{formatKsh(tx.quote.networkFeeKes, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Exchange rate</span>
                      <span>{formatKsh(tx.quote.rateKesPerUsd, { maximumFractionDigits: 2 })} / USD</span>
                    </div>

                    {tx.targets.phoneNumber && (
                      <div className="mt-1 flex justify-between text-white/70">
                        <span>Phone</span>
                        <span className="font-mono">{maskPhone(tx.targets.phoneNumber)}</span>
                      </div>
                    )}
                    {tx.targets.paybillNumber && (
                      <div className="mt-1 flex justify-between text-white/70">
                        <span>PayBill</span>
                        <span className="font-mono">{tx.targets.paybillNumber}</span>
                      </div>
                    )}
                    {tx.targets.tillNumber && (
                      <div className="mt-1 flex justify-between text-white/70">
                        <span>Till</span>
                        <span className="font-mono">{tx.targets.tillNumber}</span>
                      </div>
                    )}
                    {tx.targets.accountReference && (
                      <div className="mt-1 flex justify-between text-white/70">
                        <span>Reference</span>
                        <span className="text-right text-white/80">{tx.targets.accountReference}</span>
                      </div>
                    )}

                    <div className="mt-1 flex justify-between text-white/70">
                      <span>M-Pesa receipt</span>
                      <span>{tx.daraja.receiptNumber || "-"}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Result code</span>
                      <span>{mpesaResultCode(tx)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Result</span>
                      <span className="max-w-[60%] text-right text-white/80">{tx.daraja.resultDesc || "-"}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Updated</span>
                      <span>{formatReceiptDateTime(tx.updatedAt || tx.createdAt)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => mpesaReceiptText && shareReceipt(mpesaReceiptText)}
                    disabled={!mpesaReceiptText}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" />
                    Share receipt
                  </button>

                  <DetailsDisclosure label="Details" className="bg-black/25">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Transaction ID</span>
                        <span className="font-mono break-all text-right text-white/80">{tx.transactionId}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Quote ID</span>
                        <span className="font-mono break-all text-right text-white/80">{tx.quote.quoteId}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Flow</span>
                        <span className="text-white/80">{mpesaFlowLabel(tx.flowType)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Status</span>
                        <span className="text-white/80">{mpesaStatusLabel(tx.status)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Created</span>
                        <span className="text-right text-white/80">{formatReceiptDateTime(tx.createdAt)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Last updated</span>
                        <span className="text-right text-white/80">{formatReceiptDateTime(tx.updatedAt || tx.createdAt)}</span>
                      </div>
                      {tx.daraja.merchantRequestId && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Merchant request ID</span>
                          <span className="font-mono break-all text-right text-white/80">{tx.daraja.merchantRequestId}</span>
                        </div>
                      )}
                      {tx.daraja.checkoutRequestId && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Checkout request ID</span>
                          <span className="font-mono break-all text-right text-white/80">{tx.daraja.checkoutRequestId}</span>
                        </div>
                      )}
                      {tx.daraja.conversationId && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Conversation ID</span>
                          <span className="font-mono break-all text-right text-white/80">{tx.daraja.conversationId}</span>
                        </div>
                      )}
                      {tx.daraja.originatorConversationId && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Originator ID</span>
                          <span className="font-mono break-all text-right text-white/80">{tx.daraja.originatorConversationId}</span>
                        </div>
                      )}
                      {tx.daraja.callbackReceivedAt && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Callback received</span>
                          <span className="text-right text-white/80">{formatReceiptDateTime(tx.daraja.callbackReceivedAt)}</span>
                        </div>
                      )}
                      {tx.onchain?.txHash && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Funding TX</span>
                          <a
                            href={explorerUrl(tx.onchain.txHash, network)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-white/80 hover:text-white"
                          >
                            {shortHash(tx.onchain.txHash, 4)}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                      {tx.onchain?.chainId && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Chain ID</span>
                          <span className="text-white/80">{tx.onchain.chainId}</span>
                        </div>
                      )}
                      {tx.refund?.status !== "none" && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Refund</span>
                          <span className="max-w-[65%] text-right text-white/80">
                            {tx.refund.status}
                            {tx.refund.reason ? `: ${tx.refund.reason}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </DetailsDisclosure>

                  {Array.isArray(tx.history) && tx.history.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Timeline</p>
                      <div className="space-y-2">
                        {tx.history.map((item, idx) => (
                          <div
                            key={`${item.to}-${idx}`}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span>{mpesaTimelineLabel(item.to)}</span>
                            <span className="text-white/60">{formatReceiptDateTime(item.at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
