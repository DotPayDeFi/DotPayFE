"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useMpesaFlows } from "@/hooks/useMpesaFlows";
import { MpesaTransaction } from "@/types/mpesa";

type Step = "form" | "confirm" | "processing" | "receipt";

export function MpesaTopupPanel() {
  const { createQuote, initiateOnrampStk, pollTransaction, getTransaction } = useMpesaFlows();

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [quoteTx, setQuoteTx] = useState<MpesaTransaction | null>(null);
  const [resultTx, setResultTx] = useState<MpesaTransaction | null>(null);

  const amountValue = Number(amount);
  const canContinue = Number.isFinite(amountValue) && amountValue > 0 && /^254\d{9}$/.test(phoneNumber.trim());

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
        phoneNumber: phoneNumber.trim(),
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
      const response = await initiateOnrampStk({
        quoteId: quoteTx.quote.quoteId,
        phoneNumber: phoneNumber.trim(),
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

  return (
    <article className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 p-5">
      <h2 className="text-lg font-semibold text-white">Top up with M-Pesa</h2>
      <p className="mt-1 text-xs text-white/70">Initiate STK push, approve on your phone, then auto-credit your wallet.</p>

      {step === "form" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-white/70">Amount (KES)</label>
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
              placeholder="254712345678"
            />
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
            <div className="flex justify-between"><span>Total charge</span><strong>KES {quoteTx.quote.totalDebitKes.toFixed(2)}</strong></div>
            <div className="mt-1 flex justify-between text-white/70"><span>Wallet credit</span><span>KES {quoteTx.quote.expectedReceiveKes.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between text-white/70"><span>Fee</span><span>KES {quoteTx.quote.feeAmountKes.toFixed(2)}</span></div>
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
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for STK callback</div>
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
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300" /> Status: {resultTx.status}</div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex justify-between"><span>Transaction ID</span><span className="font-mono">{resultTx.transactionId}</span></div>
            <div className="mt-1 flex justify-between"><span>Checkout ID</span><span className="font-mono">{resultTx.daraja.checkoutRequestId || "-"}</span></div>
            <div className="mt-1 flex justify-between"><span>Receipt</span><span>{resultTx.daraja.receiptNumber || "-"}</span></div>
            <div className="mt-1 flex justify-between"><span>Result Code</span><span>{resultTx.daraja.resultCode ?? "-"}</span></div>
            <div className="mt-1 flex justify-between"><span>Result</span><span className="text-right text-white/80">{resultTx.daraja.resultDesc || "-"}</span></div>
          </div>
        </div>
      )}
    </article>
  );
}
