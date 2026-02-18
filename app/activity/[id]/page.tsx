"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Copy, ExternalLink, Share2 } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DetailsDisclosure } from "@/components/ui/DetailsDisclosure";
import { formatKsh, shortHash } from "@/lib/format";
import { getDotPayNetwork } from "@/lib/dotpayNetwork";
import { mpesaClient } from "@/lib/mpesa-client";
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

function maskPhone(phone: string) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
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
    if (!id) return;
    if (!isTxHash(id)) return;
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(`activity:${id}`) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (parsed?.kind !== "transfer" || !parsed?.transfer) return;
      setTransferSnapshot({ transfer: parsed.transfer as OnchainTransfer, kesPerUsd: parsed.kesPerUsd });
    } catch {
      // ignore
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

  const shareReceipt = useCallback(async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "DotPay receipt", text });
        return;
      } catch {
        // ignore
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
    const amount = formatKsh(tx.quote.totalDebitKes, { maximumFractionDigits: 2 });
    const kind =
      tx.flowType === "offramp"
        ? "Cash out"
        : tx.flowType === "onramp"
          ? "Top up"
          : tx.flowType === "paybill"
            ? "PayBill"
            : "Till";
    const target =
      tx.targets.phoneNumber
        ? `Phone: ${maskPhone(tx.targets.phoneNumber)}`
        : tx.targets.paybillNumber
          ? `PayBill: ${tx.targets.paybillNumber}`
          : tx.targets.tillNumber
            ? `Till: ${tx.targets.tillNumber}`
            : "";
    const mpesaReceipt = tx.daraja.receiptNumber ? `M-Pesa receipt: ${tx.daraja.receiptNumber}` : "M-Pesa receipt: -";

    return [
      "DotPay receipt",
      `Type: ${kind}`,
      `Status: ${tx.status}`,
      `Amount: ${amount}`,
      target,
      mpesaReceipt,
      `Transaction ID: ${tx.transactionId}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [tx]);

  const transferReceiptText = useMemo(() => {
    if (!transferSnapshot) return null;
    const t = transferSnapshot.transfer;
    const amountUsdc = (() => {
      const clean = String(t.value || "0").trim().replace(/^0+/, "") || "0";
      const d = Number.isFinite(t.tokenDecimal) ? Math.max(0, Math.min(t.tokenDecimal, 18)) : 6;
      const padded = clean.padStart(d + 1, "0");
      const intPart = padded.slice(0, -d);
      const fracPartRaw = padded.slice(-d);
      const fracPart = fracPartRaw.replace(/0+$/, "");
      const numStr = fracPart.length ? `${intPart}.${fracPart}` : intPart;
      const n = Number(numStr);
      return Number.isFinite(n) ? n : null;
    })();
    const rate = typeof transferSnapshot.kesPerUsd === "number" ? transferSnapshot.kesPerUsd : 155;
    const amountKes = typeof amountUsdc === "number" ? amountUsdc * rate : null;
    const amountText = typeof amountKes === "number" ? formatKsh(amountKes) : "KSh —";

    return [
      "DotPay receipt",
      "Type: Transfer",
      "Status: Completed",
      `Amount: ${amountText}`,
      `Transaction hash: ${t.hash}`,
    ].join("\n");
  }, [transferSnapshot]);

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
                This transfer is confirmed by the network. Details are optional.
              </p>

              {transferSnapshot ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Transaction hash</p>
                    <p className="mt-1 break-all font-mono text-xs text-white/80">{transferSnapshot.transfer.hash}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => transferReceiptText && shareReceipt(transferReceiptText)}
                    disabled={!transferReceiptText}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" />
                    Share receipt
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Opened from a direct link. Share or open on the explorer for full details.
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
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <strong>{formatKsh(tx.quote.totalDebitKes, { maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Status</span>
                      <span>{tx.status}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>M-Pesa receipt</span>
                      <span>{tx.daraja.receiptNumber || "-"}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Result</span>
                      <span className="max-w-[60%] text-right text-white/80">{tx.daraja.resultDesc || "-"}</span>
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
                        <span className="font-mono text-white/80">{tx.transactionId}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/65">Flow</span>
                        <span className="text-white/80">{tx.flowType}</span>
                      </div>
                      {tx.targets.phoneNumber && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Phone</span>
                          <span className="font-mono text-white/80">{maskPhone(tx.targets.phoneNumber)}</span>
                        </div>
                      )}
                      {tx.targets.paybillNumber && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">PayBill</span>
                          <span className="font-mono text-white/80">{tx.targets.paybillNumber}</span>
                        </div>
                      )}
                      {tx.targets.tillNumber && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Till</span>
                          <span className="font-mono text-white/80">{tx.targets.tillNumber}</span>
                        </div>
                      )}
                      {tx.targets.accountReference && (
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Reference</span>
                          <span className="text-white/80">{tx.targets.accountReference}</span>
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
                    </div>
                  </DetailsDisclosure>
                </div>
              )}
            </article>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
