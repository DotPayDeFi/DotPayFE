"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useActiveAccount } from "thirdweb/react";
import { useMpesaFlows } from "@/hooks/useMpesaFlows";
import { MpesaTransaction } from "@/types/mpesa";
import { toMpesaPhone } from "@/lib/kePhone";
import { formatKsh } from "@/lib/format";
import {
  buildMpesaShareText,
  formatReceiptDateTime,
  mpesaResultCode,
  mpesaStatusLabel,
  mpesaTimelineLabel,
} from "@/lib/receipt";
import { DetailsDisclosure } from "@/components/ui/DetailsDisclosure";
import { useAuthSession } from "@/context/AuthSessionContext";

type Step = "form" | "confirm" | "processing" | "receipt";

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

export function MpesaTopupPanel() {
  const { createQuote, initiateOnrampStk, precheckLiquidity, pollTransaction, getTransaction } = useMpesaFlows();
  const account = useActiveAccount();
  const { sessionUser } = useAuthSession();

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [quoteTx, setQuoteTx] = useState<MpesaTransaction | null>(null);
  const [resultTx, setResultTx] = useState<MpesaTransaction | null>(null);

  const amountValue = Number(amount);
  const normalizedPhone = toMpesaPhone(phoneNumber);
  const canContinue = Number.isFinite(amountValue) && amountValue > 0 && Boolean(normalizedPhone);
  const walletAddress =
    (account?.address ? String(account.address).trim().toLowerCase() : "") ||
    (sessionUser?.address ? String(sessionUser.address).trim().toLowerCase() : "") ||
    undefined;

  async function handleQuote() {
    if (!canContinue) {
      toast.error("Enter valid amount and phone number.");
      return;
    }

    try {
      setBusy(true);
      const response = await createQuote({
        flowType: "onramp",
        amount: amountValue,
        currency: "KES",
        phoneNumber: normalizedPhone || phoneNumber.trim(),
        walletAddress,
      });
      setQuoteTx(response.data.transaction);
      setStep("confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create quote.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartTopup() {
    if (!quoteTx?.quote?.quoteId) {
      toast.error("Quote is missing.");
      return;
    }

    try {
      setBusy(true);
      setStep("processing");
      const precheck = await precheckLiquidity({
        quoteId: quoteTx.quote.quoteId,
        flowType: "onramp",
      });
      if (!precheck.canProceed) {
        throw new Error(precheck.message || "Top up cannot proceed right now.");
      }
      const response = await initiateOnrampStk({
        quoteId: quoteTx.quote.quoteId,
        phoneNumber: normalizedPhone || phoneNumber.trim(),
        walletAddress,
      });
      const terminal = await pollTransaction(response.data.transactionId, {
        intervalMs: 3500,
        timeoutMs: 120000,
      });
      setResultTx(terminal);
      setStep("receipt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top-up failed.");
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    const txId = resultTx?.transactionId || quoteTx?.transactionId;
    if (!txId) return;
    try {
      setBusy(true);
      const tx = await getTransaction(txId);
      setResultTx(tx);
      if (["succeeded", "failed", "refunded"].includes(tx.status)) {
        setStep("receipt");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  async function shareReceipt(tx: MpesaTransaction) {
    const text = buildMpesaShareText(tx);

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
  }

  return (
    <article className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 p-5">
      <h2 className="text-lg font-semibold text-white">Top up with M-Pesa</h2>
      <p className="mt-1 text-xs text-white/70">Approve the prompt on your phone, then we’ll credit your DotPay balance.</p>

      {step === "form" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-white/70">Amount (KSh)</label>
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">M-Pesa Phone</label>
            <input
              type="tel"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="07xx xxx xxx"
            />
            <p className="mt-2 text-[11px] text-white/55">We’ll format it as 2547… for M-Pesa.</p>
          </div>

          <button
            type="button"
            onClick={handleQuote}
            disabled={busy || !canContinue}
            className="md:col-span-2 rounded-xl border border-cyan-300/20 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {busy ? "Creating quote..." : "Continue"}
          </button>
        </div>
      )}

      {step === "confirm" && quoteTx && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex justify-between">
              <span>Total charge</span>
              <strong>{formatKsh(quoteTx.quote.totalDebitKes, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Wallet credit</span>
              <span>{formatKsh(quoteTx.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>USD credit</span>
              <span>{quoteTx.quote.amountUsd.toFixed(6)} USD</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Fee</span>
              <span>{formatKsh(quoteTx.quote.feeAmountKes, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Network fee</span>
              <span>{formatKsh(quoteTx.quote.networkFeeKes, { maximumFractionDigits: 2 })}</span>
            </div>
            <DetailsDisclosure label="Details" className="mt-3 bg-black/10">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Quote ID</span>
                  <span className="font-mono text-white/80 break-all text-right">{quoteTx.quote.quoteId}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Exchange rate</span>
                  <span className="text-white/80">1 USD ≈ {formatKsh(quoteTx.quote.rateKesPerUsd, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Phone</span>
                  <span className="font-mono text-white/80">{normalizedPhone || "-"}</span>
                </div>
                {walletAddress && (
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Wallet</span>
                    <span className="font-mono text-white/80 break-all text-right">{walletAddress}</span>
                  </div>
                )}
              </div>
            </DetailsDisclosure>
          </div>

          <button
            type="button"
            onClick={handleStartTopup}
            disabled={busy}
            className="w-full rounded-xl border border-emerald-300/20 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {busy ? "Submitting..." : "Initiate STK Push"}
          </button>
        </div>
      )}

      {step === "processing" && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Waiting for M-Pesa confirmation
          </div>
          <p className="mt-1 text-xs text-white/70">Approve the prompt on your phone to continue.</p>
          <button
            type="button"
            onClick={refreshStatus}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh status
          </button>
        </div>
      )}

      {step === "receipt" && resultTx && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${receiptStatusIconClass(resultTx.status)}`} />
              <span className="font-semibold">Top up</span>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${receiptStatusClasses(resultTx.status)}`}
            >
              {mpesaStatusLabel(resultTx.status)}
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex justify-between">
              <span>Amount paid</span>
              <strong>{formatKsh(resultTx.quote.totalDebitKes, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Wallet credit</span>
              <span>{formatKsh(resultTx.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>USD credit</span>
              <span>{resultTx.quote.amountUsd.toFixed(6)} USD</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>M-Pesa phone</span>
              <span className="font-mono">{resultTx.targets.phoneNumber || "-"}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>M-Pesa receipt</span>
              <span>{resultTx.daraja.receiptNumber || "-"}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Result code</span>
              <span>{mpesaResultCode(resultTx)}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Result</span>
              <span className="max-w-[60%] text-right text-white/80">{resultTx.daraja.resultDesc || "-"}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Updated</span>
              <span>{formatReceiptDateTime(resultTx.updatedAt || resultTx.createdAt)}</span>
            </div>
            <DetailsDisclosure label="Details" className="mt-3 bg-black/10">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Transaction ID</span>
                  <span className="font-mono text-white/80 break-all text-right">{resultTx.transactionId}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Quote ID</span>
                  <span className="font-mono text-white/80 break-all text-right">{resultTx.quote.quoteId}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Created</span>
                  <span className="text-white/80 text-right">{formatReceiptDateTime(resultTx.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Checkout ID</span>
                  <span className="font-mono text-white/80 break-all text-right">{resultTx.daraja.checkoutRequestId || "-"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Conversation ID</span>
                  <span className="font-mono text-white/80 break-all text-right">{resultTx.daraja.conversationId || "-"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Merchant request ID</span>
                  <span className="font-mono text-white/80 break-all text-right">{resultTx.daraja.merchantRequestId || "-"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/65">Result code</span>
                  <span className="text-white/80">{mpesaResultCode(resultTx)}</span>
                </div>
                {resultTx.daraja.callbackReceivedAt && (
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Callback received</span>
                    <span className="text-white/80 text-right">
                      {formatReceiptDateTime(resultTx.daraja.callbackReceivedAt)}
                    </span>
                  </div>
                )}
                {resultTx.targets.walletAddress && (
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Wallet credited</span>
                    <span className="font-mono text-white/80 break-all text-right">{resultTx.targets.walletAddress}</span>
                  </div>
                )}
                {resultTx.onchain?.txHash && (
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">On-chain credit TX</span>
                    <span className="font-mono text-white/80 break-all text-right">{resultTx.onchain.txHash}</span>
                  </div>
                )}
              </div>
            </DetailsDisclosure>
          </div>

          {Array.isArray(resultTx.history) && resultTx.history.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Timeline</p>
              <div className="space-y-2">
                {resultTx.history.map((item, idx) => (
                  <div key={`${item.to}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
                    <span>{mpesaTimelineLabel(item.to)}</span>
                    <span className="text-white/60">{formatReceiptDateTime(item.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => shareReceipt(resultTx)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25"
          >
            <Share2 className="h-4 w-4" />
            Share receipt
          </button>
        </div>
      )}
    </article>
  );
}
