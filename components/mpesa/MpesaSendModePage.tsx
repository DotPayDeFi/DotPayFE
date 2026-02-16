"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getContract, waitForReceipt } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useMpesaFlows } from "@/hooks/useMpesaFlows";
import { getDotPayNetwork, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import { buildMpesaAuthorizationMessage } from "@/lib/mpesa-signing";
import { thirdwebClient } from "@/lib/thirdwebClient";
import { MpesaFlowType, MpesaTransaction } from "@/types/mpesa";

const USDC_ARBITRUM_SEPOLIA_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;
const USDC_ARBITRUM_ONE_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;

type SendMode = "cashout" | "paybill" | "buygoods";
type Step = "form" | "confirm" | "processing" | "receipt";

const FLOW_MAP: Record<SendMode, MpesaFlowType> = {
  cashout: "offramp",
  paybill: "paybill",
  buygoods: "buygoods",
};

const LABELS: Record<SendMode, { title: string; subtitle: string }> = {
  cashout: {
    title: "Cash out to M-Pesa",
    subtitle: "Convert wallet balance to KES and send to a phone number.",
  },
  paybill: {
    title: "PayBill",
    subtitle: "Pay a business paybill number with a tracked receipt.",
  },
  buygoods: {
    title: "BuyGoods",
    subtitle: "Pay a till number at local merchants.",
  },
};

function createNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function createIdempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shortAddress(value: string) {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function MpesaSendModePage({ mode, onBack }: { mode: SendMode; onBack: () => void }) {
  const account = useActiveAccount();
  const {
    createQuote,
    initiateOfframp,
    initiatePaybill,
    initiateBuygoods,
    pollTransaction,
    getTransaction,
  } = useMpesaFlows();
  const { mutateAsync: sendOnchainTx } = useSendTransaction({
    payModal: false,
  });

  const dotpayNetwork = getDotPayNetwork();
  const usdcChain = getDotPayUsdcChain(dotpayNetwork);
  const fallbackUsdcAddress =
    dotpayNetwork === "sepolia" ? USDC_ARBITRUM_SEPOLIA_ADDRESS : USDC_ARBITRUM_ONE_ADDRESS;

  const [step, setStep] = useState<Step>("form");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paybillNumber, setPaybillNumber] = useState("");
  const [tillNumber, setTillNumber] = useState("");
  const [accountReference, setAccountReference] = useState("");
  const [quoteTransaction, setQuoteTransaction] = useState<MpesaTransaction | null>(null);
  const [resultTransaction, setResultTransaction] = useState<MpesaTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("Processing M-Pesa transaction");
  const idempotencyKeyRef = useRef<string | null>(null);

  const labels = LABELS[mode];
  const flowType = FLOW_MAP[mode];

  const targetFieldValid = useMemo(() => {
    if (mode === "cashout") return /^254\d{9}$/.test(phoneNumber.trim());
    if (mode === "paybill") return /^\d{5,8}$/.test(paybillNumber.trim()) && accountReference.trim().length >= 2;
    return /^\d{5,8}$/.test(tillNumber.trim());
  }, [mode, phoneNumber, paybillNumber, accountReference, tillNumber]);

  const amountValue = Number(amount);
  const canQuote = Number.isFinite(amountValue) && amountValue > 0 && targetFieldValid;

  async function handleCreateQuote() {
    if (!canQuote) {
      toast.error("Fill all required fields correctly.");
      return;
    }

    try {
      setBusy(true);
      const payload: any = {
        flowType,
        amount: amountValue,
        currency: "KES",
      };

      if (mode === "cashout") payload.phoneNumber = phoneNumber.trim();
      if (mode === "paybill") {
        payload.paybillNumber = paybillNumber.trim();
        payload.accountReference = accountReference.trim();
      }
      if (mode === "buygoods") {
        payload.tillNumber = tillNumber.trim();
        payload.accountReference = accountReference.trim() || "DotPay";
      }

      const response = await createQuote(payload);
      setQuoteTransaction(response.data.transaction);
      setStep("confirm");
      idempotencyKeyRef.current = createIdempotencyKey(flowType);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create quote.");
    } finally {
      setBusy(false);
    }
  }

  async function signIntent(tx: MpesaTransaction, signedAt: string, nonce: string) {
    if (!account || typeof (account as any).signMessage !== "function") {
      throw new Error("Reconnect your wallet to authorize this transfer.");
    }

    const message = buildMpesaAuthorizationMessage({
      tx,
      signedAt,
      nonce,
    });

    return (account as any).signMessage({ message });
  }

  async function submitOnchainFunding(tx: MpesaTransaction) {
    if (!tx.onchain?.required) {
      return {
        onchainTxHash: undefined as string | undefined,
        chainId: undefined as number | undefined,
      };
    }

    const expectedAmountUnits = String(tx.onchain.expectedAmountUnits || "").trim();
    const treasuryAddress = String(tx.onchain.treasuryAddress || "").trim();
    const tokenAddress = String(tx.onchain.tokenAddress || "").trim() || fallbackUsdcAddress;
    const chainId = typeof tx.onchain.chainId === "number" ? tx.onchain.chainId : usdcChain.id;

    if (!expectedAmountUnits || !/^\d+$/.test(expectedAmountUnits)) {
      throw new Error("Quote is missing the required USDC funding amount.");
    }
    if (!treasuryAddress || !/^0x[a-fA-F0-9]{40}$/.test(treasuryAddress)) {
      throw new Error("Treasury address is not configured correctly.");
    }
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      throw new Error("USDC contract address is not configured correctly.");
    }
    if (chainId !== usdcChain.id) {
      throw new Error(`Wrong chain for funding. Expected chain ${usdcChain.id}.`);
    }

    setProcessingLabel("Debiting USDC from your wallet");
    const usdcContract = getContract({
      client: thirdwebClient,
      chain: usdcChain,
      address: tokenAddress,
    });

    const fundingTx = transfer({
      contract: usdcContract,
      to: treasuryAddress,
      amountWei: BigInt(expectedAmountUnits),
    });

    const sent = await sendOnchainTx(fundingTx);
    await waitForReceipt({
      chain: usdcChain,
      client: thirdwebClient,
      transactionHash: sent.transactionHash,
    });

    return {
      onchainTxHash: sent.transactionHash,
      chainId,
    };
  }

  async function handleConfirmAndSend() {
    if (!quoteTransaction?.quote?.quoteId) {
      toast.error("Missing quote. Start again.");
      return;
    }
    if (!pin || pin.length < 4) {
      toast.error("Enter your app PIN.");
      return;
    }

    try {
      setBusy(true);
      setStep("processing");
      setProcessingLabel("Authorizing transfer");

      const signedAt = new Date().toISOString();
      const nonce = createNonce();
      const signature = await signIntent(quoteTransaction, signedAt, nonce);
      const funding = await submitOnchainFunding(quoteTransaction);
      setProcessingLabel("Submitting M-Pesa request");

      const idempotencyKey =
        idempotencyKeyRef.current || createIdempotencyKey(flowType);
      idempotencyKeyRef.current = idempotencyKey;

      let initiated: MpesaTransaction;
      if (mode === "cashout") {
        const response = await initiateOfframp({
          idempotencyKey,
          quoteId: quoteTransaction.quote.quoteId,
          phoneNumber: phoneNumber.trim(),
          pin,
          signature,
          signedAt,
          nonce,
          onchainTxHash: funding.onchainTxHash,
          chainId: funding.chainId,
        });
        initiated = response.data;
      } else if (mode === "paybill") {
        const response = await initiatePaybill({
          idempotencyKey,
          quoteId: quoteTransaction.quote.quoteId,
          paybillNumber: paybillNumber.trim(),
          accountReference: accountReference.trim(),
          pin,
          signature,
          signedAt,
          nonce,
          onchainTxHash: funding.onchainTxHash,
          chainId: funding.chainId,
        });
        initiated = response.data;
      } else {
        const response = await initiateBuygoods({
          idempotencyKey,
          quoteId: quoteTransaction.quote.quoteId,
          tillNumber: tillNumber.trim(),
          accountReference: accountReference.trim() || "DotPay",
          pin,
          signature,
          signedAt,
          nonce,
          onchainTxHash: funding.onchainTxHash,
          chainId: funding.chainId,
        });
        initiated = response.data;
      }

      setProcessingLabel("Waiting for M-Pesa callback");
      const terminal = await pollTransaction(initiated.transactionId, {
        intervalMs: 3500,
        timeoutMs: 120000,
      });
      setResultTransaction(terminal);
      setStep("receipt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit transaction.");
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualRefresh() {
    if (!quoteTransaction?.transactionId && !resultTransaction?.transactionId) return;
    const txId = resultTransaction?.transactionId || quoteTransaction?.transactionId;
    if (!txId) return;

    try {
      setBusy(true);
      const tx = await getTransaction(txId);
      setResultTransaction(tx);
      if (["succeeded", "failed", "refunded"].includes(tx.status)) {
        setStep("receipt");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  function resetFlow() {
    setStep("form");
    setPin("");
    setQuoteTransaction(null);
    setResultTransaction(null);
    setProcessingLabel("Processing M-Pesa transaction");
    idempotencyKeyRef.current = null;
  }

  return (
    <main className="app-background min-h-screen px-4 pb-24 pt-6 text-white !items-stretch !justify-start">
      <section className="mx-auto w-full max-w-2xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={step === "form" ? onBack : resetFlow}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === "form" ? "Back" : "Start over"}
          </button>
        </header>

        <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h1 className="text-xl font-semibold">{labels.title}</h1>
          <p className="mt-1 text-sm text-white/70">{labels.subtitle}</p>

          {step === "form" && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-white/70">Amount (KES)</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                />
              </div>

              {mode === "cashout" && (
                <div>
                  <label className="text-xs text-white/70">Phone Number</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="254712345678"
                  />
                </div>
              )}

              {mode === "paybill" && (
                <>
                  <div>
                    <label className="text-xs text-white/70">PayBill Number</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                      value={paybillNumber}
                      onChange={(e) => setPaybillNumber(e.target.value)}
                      placeholder="400200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70">Account Reference</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                      value={accountReference}
                      onChange={(e) => setAccountReference(e.target.value)}
                      placeholder="Invoice 123"
                    />
                  </div>
                </>
              )}

              {mode === "buygoods" && (
                <>
                  <div>
                    <label className="text-xs text-white/70">Till Number</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                      value={tillNumber}
                      onChange={(e) => setTillNumber(e.target.value)}
                      placeholder="508508"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70">Reference (optional)</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                      value={accountReference}
                      onChange={(e) => setAccountReference(e.target.value)}
                      placeholder="Order 001"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleCreateQuote}
                disabled={busy || !canQuote}
                className="w-full rounded-xl border border-cyan-300/20 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {busy ? "Creating quote..." : "Continue"}
              </button>
            </div>
          )}

          {step === "confirm" && quoteTransaction && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="flex justify-between">
                  <span>Total debit</span>
                  <strong>KES {quoteTransaction.quote.totalDebitKes.toFixed(2)}</strong>
                </div>
                <div className="mt-1 flex justify-between text-white/70">
                  <span>Receive amount</span>
                  <span>KES {quoteTransaction.quote.expectedReceiveKes.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between text-white/70">
                  <span>Fee</span>
                  <span>KES {quoteTransaction.quote.feeAmountKes.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between text-white/70">
                  <span>Network fee</span>
                  <span>KES {quoteTransaction.quote.networkFeeKes.toFixed(2)}</span>
                </div>
                {quoteTransaction.onchain?.required && (
                  <>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>USDC wallet debit</span>
                      <span>{(quoteTransaction.onchain.expectedAmountUsd || 0).toFixed(6)} USDC</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Treasury wallet</span>
                      <span className="font-mono">
                        {shortAddress(String(quoteTransaction.onchain.treasuryAddress || ""))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs text-white/70">App PIN</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmAndSend}
                disabled={busy || pin.length < 4}
                className="w-full rounded-xl border border-emerald-300/20 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {busy ? "Submitting..." : "Confirm and Send"}
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex items-center gap-2 text-white/90">
                <Loader2 className="h-4 w-4 animate-spin" />
                {processingLabel}
              </div>
              <p className="mt-2 text-xs text-white/70">
                We are waiting for Daraja callback confirmation.
              </p>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh status
              </button>
            </div>
          )}

          {step === "receipt" && resultTransaction && (
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <span className="font-semibold">Transaction {resultTransaction.status}</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex justify-between">
                  <span>Transaction ID</span>
                  <span className="font-mono">{resultTransaction.transactionId}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Flow</span>
                  <span>{resultTransaction.flowType}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Status</span>
                  <span>{resultTransaction.status}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>M-Pesa Receipt</span>
                  <span>{resultTransaction.daraja.receiptNumber || "-"}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Funding TX</span>
                  <span className="font-mono">
                    {resultTransaction.onchain?.txHash
                      ? shortAddress(resultTransaction.onchain.txHash)
                      : "-"}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Result Code</span>
                  <span>
                    {resultTransaction.daraja.resultCode ??
                      resultTransaction.daraja.resultCodeRaw ??
                      "-"}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Result</span>
                  <span className="max-w-[60%] text-right text-white/80">
                    {resultTransaction.daraja.resultDesc || "-"}
                  </span>
                </div>
                {resultTransaction.refund?.status !== "none" && (
                  <div className="mt-1 flex justify-between">
                    <span>Refund</span>
                    <span className="max-w-[60%] text-right text-white/80">
                      {resultTransaction.refund.status}
                      {resultTransaction.refund.reason
                        ? `: ${resultTransaction.refund.reason}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Timeline</p>
                <div className="space-y-2">
                  {resultTransaction.history?.map((item, idx) => (
                    <div
                      key={`${item.to}-${idx}`}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span>{item.to}</span>
                      <span className="text-white/60">
                        {new Date(item.at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
