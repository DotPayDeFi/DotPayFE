"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getContract, waitForReceipt } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { useActiveAccount, useConnectModal, useIsAutoConnecting, useSendTransaction } from "thirdweb/react";
import { useMpesaFlows } from "@/hooks/useMpesaFlows";
import { getDotPayNetwork, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import { getDotPayAccountAbstraction } from "@/lib/thirdwebAccountAbstraction";
import { formatKsh, shortHash } from "@/lib/format";
import { toMpesaPhone } from "@/lib/kePhone";
import { buildMpesaAuthorizationMessage } from "@/lib/mpesa-signing";
import { thirdwebClient } from "@/lib/thirdwebClient";
import { MpesaFlowType, MpesaTransaction } from "@/types/mpesa";
import { DetailsDisclosure } from "@/components/ui/DetailsDisclosure";
import { PinKeyboardInput } from "@/components/ui/PinKeyboardInput";

const USDC_ARBITRUM_SEPOLIA_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;
const USDC_ARBITRUM_ONE_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;
const PIN_LENGTH = 6;

type SendMode = "cashout" | "paybill" | "buygoods";
type Step = "form" | "confirm" | "processing" | "receipt";

const FAVORITES_PAYBILL_KEY = "dotpay_favorites_paybill_v1";
const FAVORITES_TILL_KEY = "dotpay_favorites_till_v1";
const FAVORITES_MAX = 8;

type PaybillFavorite = {
  paybillNumber: string;
  accountReference: string;
  savedAt: number;
};

type TillFavorite = {
  tillNumber: string;
  accountReference: string | null;
  savedAt: number;
};

function readFavorites<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function upsertPaybillFavorite(
  existing: PaybillFavorite[],
  input: { paybillNumber: string; accountReference: string }
) {
  const paybillNumber = input.paybillNumber.trim();
  const accountReference = input.accountReference.trim();
  if (!paybillNumber || !accountReference) return existing;

  const filtered = existing.filter(
    (f) => !(f.paybillNumber === paybillNumber && f.accountReference === accountReference)
  );
  const next: PaybillFavorite = { paybillNumber, accountReference, savedAt: Date.now() };
  return [next, ...filtered].slice(0, FAVORITES_MAX);
}

function upsertTillFavorite(
  existing: TillFavorite[],
  input: { tillNumber: string; accountReference: string | null }
) {
  const tillNumber = input.tillNumber.trim();
  if (!tillNumber) return existing;

  const accountReference = input.accountReference ? input.accountReference.trim() : null;
  const filtered = existing.filter((f) => f.tillNumber !== tillNumber);
  const next: TillFavorite = { tillNumber, accountReference, savedAt: Date.now() };
  return [next, ...filtered].slice(0, FAVORITES_MAX);
}

const FRIENDLY_TIMELINE_LABELS: Record<string, string> = {
  created: "Created",
  quoted: "Quote created",
  awaiting_user_authorization: "Approved in DotPay",
  awaiting_onchain_funding: "Processing payment",
  mpesa_submitted: "Sent request to M-Pesa",
  mpesa_processing: "Waiting for M-Pesa confirmation",
  succeeded: "Completed",
  failed: "Failed",
  refund_pending: "Refunding",
  refunded: "Refunded",
};

function timelineLabel(value: string) {
  const key = String(value || "").trim();
  if (!key) return "Update";
  return FRIENDLY_TIMELINE_LABELS[key] || key.replace(/_/g, " ");
}

const FLOW_MAP: Record<SendMode, MpesaFlowType> = {
  cashout: "offramp",
  paybill: "paybill",
  buygoods: "buygoods",
};

const LABELS: Record<SendMode, { title: string; subtitle: string }> = {
  cashout: {
    title: "Cash out to M-Pesa",
    subtitle: "Convert your balance to KSh and send to a phone number.",
  },
  paybill: {
    title: "PayBill",
    subtitle: "Pay a business paybill number with a tracked receipt.",
  },
  buygoods: {
    title: "Till (Buy Goods)",
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
  return shortHash(value, 4).replace("…", "...");
}

function normalizePin(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
}

function normalizeSignature(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[0-9a-fA-F]{130,}$/.test(trimmed)) return `0x${trimmed}`;
    return trimmed;
  }

  // Some thirdweb account types return an object shape.
  if (typeof value === "object") {
    const maybe = (value as any)?.signature ?? (value as any)?.result ?? (value as any)?.data;
    if (typeof maybe === "string") {
      const trimmed = maybe.trim();
      if (/^[0-9a-fA-F]{130,}$/.test(trimmed)) return `0x${trimmed}`;
      return trimmed;
    }
  }

  // Sometimes libraries return a byte array.
  if (value instanceof Uint8Array) {
    return `0x${Array.from(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  if (Array.isArray(value) && value.every((x) => typeof x === "number")) {
    return `0x${value
      .map((b) => Number(b).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return String(value).trim();
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  if (typeof err === "string" && err.trim()) return err.trim();

  if (err && typeof err === "object") {
    const e = err as any;
    const candidates = [
      e?.message,
      e?.shortMessage,
      e?.reason,
      e?.details,
      e?.error?.message,
      e?.cause?.message,
      e?.data?.message,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return "Failed to submit transaction.";
}

export function MpesaSendModePage({ mode, onBack }: { mode: SendMode; onBack: () => void }) {
  const account = useActiveAccount();
  const { connect, isConnecting } = useConnectModal();
  const isAutoConnecting = useIsAutoConnecting();
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
  const accountAbstraction = useMemo(
    () => getDotPayAccountAbstraction(usdcChain),
    [usdcChain]
  );
  const fallbackUsdcAddress =
    dotpayNetwork === "sepolia" ? USDC_ARBITRUM_SEPOLIA_ADDRESS : USDC_ARBITRUM_ONE_ADDRESS;

  const [step, setStep] = useState<Step>("form");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paybillNumber, setPaybillNumber] = useState("");
  const [tillNumber, setTillNumber] = useState("");
  const [accountReference, setAccountReference] = useState("");
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [paybillFavorites, setPaybillFavorites] = useState<PaybillFavorite[]>([]);
  const [tillFavorites, setTillFavorites] = useState<TillFavorite[]>([]);
  const [selectedPaybillFavorite, setSelectedPaybillFavorite] = useState("");
  const [selectedTillFavorite, setSelectedTillFavorite] = useState("");
  const [quoteTransaction, setQuoteTransaction] = useState<MpesaTransaction | null>(null);
  const [resultTransaction, setResultTransaction] = useState<MpesaTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("Processing M-Pesa transaction");
  const idempotencyKeyRef = useRef<string | null>(null);

  const labels = LABELS[mode];
  const flowType = FLOW_MAP[mode];
  const canSignIntent = Boolean(account && typeof (account as any).signMessage === "function");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mode === "paybill") {
      setPaybillFavorites(readFavorites<PaybillFavorite>(FAVORITES_PAYBILL_KEY));
    }
    if (mode === "buygoods") {
      setTillFavorites(readFavorites<TillFavorite>(FAVORITES_TILL_KEY));
    }
    setSaveFavorite(false);
    setSelectedPaybillFavorite("");
    setSelectedTillFavorite("");
  }, [mode]);

  useEffect(() => {
    if (mode !== "paybill") return;
    if (!selectedPaybillFavorite) return;
    const found = paybillFavorites.find(
      (f) => `${f.paybillNumber}::${f.accountReference}` === selectedPaybillFavorite
    );
    if (!found) return;
    setPaybillNumber(found.paybillNumber);
    setAccountReference(found.accountReference);
  }, [mode, paybillFavorites, selectedPaybillFavorite]);

  useEffect(() => {
    if (mode !== "buygoods") return;
    if (!selectedTillFavorite) return;
    const found = tillFavorites.find((f) => f.tillNumber === selectedTillFavorite);
    if (!found) return;
    setTillNumber(found.tillNumber);
    setAccountReference(found.accountReference || "");
  }, [mode, selectedTillFavorite, tillFavorites]);

  const normalizedMpesaPhone = useMemo(() => {
    if (mode !== "cashout") return null;
    return toMpesaPhone(phoneNumber);
  }, [mode, phoneNumber]);

  const targetFieldValid = useMemo(() => {
    if (mode === "cashout") return Boolean(normalizedMpesaPhone);
    if (mode === "paybill") return /^\d{5,8}$/.test(paybillNumber.trim()) && accountReference.trim().length >= 2;
    return /^\d{5,8}$/.test(tillNumber.trim());
  }, [mode, normalizedMpesaPhone, paybillNumber, accountReference, tillNumber]);

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

      if (mode === "cashout") payload.phoneNumber = normalizedMpesaPhone || phoneNumber.trim();
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
      throw new Error("Wallet signer is unavailable. Reconnect your wallet to authorize this transfer.");
    }

    const message = buildMpesaAuthorizationMessage({
      tx,
      signedAt,
      nonce,
    });

    const rawSignature = await (account as any).signMessage({ message });
    const signature = normalizeSignature(rawSignature);
    if (!/^0x[0-9a-fA-F]{130,}$/.test(signature)) {
      throw new Error("Failed to generate a valid authorization signature. Reconnect and try again.");
    }
    return signature;
  }

  async function handleReconnectWallet() {
    try {
      const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      await connect({
        client: thirdwebClient,
        chain: usdcChain,
        chains: [usdcChain],
        accountAbstraction,
        wallets: undefined,
        recommendedWallets: undefined,
        showAllWallets: false,
        appMetadata: {
          name: "DotPay",
          url: "https://app.dotpay.xyz",
          description: "Mobile wallet for fast payments and clear receipts.",
          logoUrl: "https://app.dotpay.xyz/icons/icon-192x192.png",
        },
        theme: "dark",
        connectModal: {
          size: "compact",
          showThirdwebBranding: false,
          title: "Reconnect wallet",
        },
        walletConnect: walletConnectProjectId
          ? {
              projectId: walletConnectProjectId,
            }
          : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet reconnect failed.";
      toast.error(message);
    }
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

    setProcessingLabel("Processing your payment");
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
    const normalizedPin = normalizePin(pin);
    if (!normalizedPin || normalizedPin.length !== PIN_LENGTH) {
      toast.error(`Enter your ${PIN_LENGTH}-digit app PIN.`);
      return;
    }

    let phase = "start";
    try {
      setBusy(true);
      setStep("processing");
      setProcessingLabel("Approving payment");

      const signedAt = new Date().toISOString();
      const nonce = createNonce();
      phase = "sign_intent";
      const signature = await signIntent(quoteTransaction, signedAt, nonce);
      phase = "onchain_funding";
      const funding = await submitOnchainFunding(quoteTransaction);
      setProcessingLabel("Sending request to M-Pesa");

      const idempotencyKey =
        idempotencyKeyRef.current || createIdempotencyKey(flowType);
      idempotencyKeyRef.current = idempotencyKey;

      let initiated: MpesaTransaction;
      if (mode === "cashout") {
        phase = "initiate_offramp";
        const response = await initiateOfframp({
          idempotencyKey,
          quoteId: quoteTransaction.quote.quoteId,
          phoneNumber: normalizedMpesaPhone || phoneNumber.trim(),
          pin: normalizedPin,
          signature,
          signedAt,
          nonce,
          onchainTxHash: funding.onchainTxHash,
          chainId: funding.chainId,
        });
        initiated = response.data;
      } else if (mode === "paybill") {
        phase = "initiate_paybill";
        const response = await initiatePaybill({
          idempotencyKey,
          quoteId: quoteTransaction.quote.quoteId,
          paybillNumber: paybillNumber.trim(),
          accountReference: accountReference.trim(),
          pin: normalizedPin,
          signature,
          signedAt,
          nonce,
          onchainTxHash: funding.onchainTxHash,
          chainId: funding.chainId,
        });
        initiated = response.data;
      } else {
        phase = "initiate_buygoods";
        const response = await initiateBuygoods({
          idempotencyKey,
          quoteId: quoteTransaction.quote.quoteId,
          tillNumber: tillNumber.trim(),
          accountReference: accountReference.trim() || "DotPay",
          pin: normalizedPin,
          signature,
          signedAt,
          nonce,
          onchainTxHash: funding.onchainTxHash,
          chainId: funding.chainId,
        });
        initiated = response.data;
      }

      setProcessingLabel("Waiting for M-Pesa confirmation");
      phase = "poll_transaction";
      const terminal = await pollTransaction(initiated.transactionId, {
        intervalMs: 3500,
        timeoutMs: 120000,
      });
      setResultTransaction(terminal);
      setStep("receipt");

      if (saveFavorite) {
        if (mode === "paybill") {
          const next = upsertPaybillFavorite(readFavorites<PaybillFavorite>(FAVORITES_PAYBILL_KEY), {
            paybillNumber,
            accountReference,
          });
          writeFavorites(FAVORITES_PAYBILL_KEY, next);
          setPaybillFavorites(next);
        }
        if (mode === "buygoods") {
          const next = upsertTillFavorite(readFavorites<TillFavorite>(FAVORITES_TILL_KEY), {
            tillNumber,
            accountReference: accountReference.trim() ? accountReference : null,
          });
          writeFavorites(FAVORITES_TILL_KEY, next);
          setTillFavorites(next);
        }
        setSaveFavorite(false);
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      console.error(`[M-Pesa FE] submit failed phase=${phase}`, err);
      toast.error(message);
      if (message.toLowerCase().includes("pin is not set")) {
        if (typeof window !== "undefined") {
          window.location.assign("/onboarding/pin");
          return;
        }
      }
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

  async function shareReceipt(tx: MpesaTransaction) {
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
        ? `Phone: ${tx.targets.phoneNumber}`
        : tx.targets.paybillNumber
          ? `PayBill: ${tx.targets.paybillNumber}`
          : tx.targets.tillNumber
            ? `Till: ${tx.targets.tillNumber}`
            : "";
    const mpesaReceipt = tx.daraja.receiptNumber ? `M-Pesa receipt: ${tx.daraja.receiptNumber}` : "M-Pesa receipt: -";
    const onchainTx = tx.onchain?.txHash ? `On-chain TX: ${tx.onchain.txHash}` : "On-chain TX: -";

    const text = [
      "DotPay receipt",
      `Type: ${kind}`,
      `Status: ${tx.status}`,
      `Amount: ${amount}`,
      target,
      mpesaReceipt,
      onchainTx,
      `Transaction ID: ${tx.transactionId}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "DotPay receipt", text });
        return;
      } catch {
        // user cancelled or share failed
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
    <main className="app-background min-h-screen px-4 pb-8 pt-6 text-white !items-stretch !justify-start">
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
                <label className="text-xs text-white/70">Amount (KSh)</label>
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
                  <label className="text-xs text-white/70">M-Pesa phone</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="07xx xxx xxx"
                  />
                  <p className="mt-2 text-[11px] text-white/55">We’ll format it as 2547… for M-Pesa.</p>
                </div>
              )}

              {mode === "paybill" && (
                <>
                  {paybillFavorites.length > 0 && (
                    <div>
                      <label className="text-xs text-white/70">Saved</label>
                      <select
                        value={selectedPaybillFavorite}
                        onChange={(e) => setSelectedPaybillFavorite(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                      >
                        <option value="">Choose saved paybill</option>
                        {paybillFavorites.map((f) => (
                          <option
                            key={`${f.paybillNumber}::${f.accountReference}`}
                            value={`${f.paybillNumber}::${f.accountReference}`}
                          >
                            {f.paybillNumber} · {f.accountReference}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={saveFavorite}
                      onChange={(e) => setSaveFavorite(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/30"
                    />
                    Save as favorite
                  </label>
                </>
              )}

              {mode === "buygoods" && (
                <>
                  {tillFavorites.length > 0 && (
                    <div>
                      <label className="text-xs text-white/70">Saved</label>
                      <select
                        value={selectedTillFavorite}
                        onChange={(e) => setSelectedTillFavorite(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                      >
                        <option value="">Choose saved till</option>
                        {tillFavorites.map((f) => (
                          <option key={f.tillNumber} value={f.tillNumber}>
                            {f.tillNumber}
                            {f.accountReference ? ` · ${f.accountReference}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={saveFavorite}
                      onChange={(e) => setSaveFavorite(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/30"
                    />
                    Save as favorite
                  </label>
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
                  <strong>{formatKsh(quoteTransaction.quote.totalDebitKes, { maximumFractionDigits: 2 })}</strong>
                </div>
                <div className="mt-1 flex justify-between text-white/70">
                  <span>{mode === "cashout" ? "Recipient receives" : "Merchant receives"}</span>
                  <span>{formatKsh(quoteTransaction.quote.expectedReceiveKes, { maximumFractionDigits: 2 })}</span>
                </div>

                <DetailsDisclosure label="Details" className="mt-3 bg-black/10">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-white/65">Quote ID</span>
                      <span className="font-mono text-white/80">{quoteTransaction.quote.quoteId}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/65">Exchange rate</span>
                      <span className="text-white/80">
                        1 USD ≈ {formatKsh(quoteTransaction.quote.rateKesPerUsd, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {quoteTransaction.onchain?.required && (
                      <>
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Token</span>
                          <span className="text-white/80">{quoteTransaction.onchain.tokenSymbol || "USDC"}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Wallet debit</span>
                          <span className="text-white/80">
                            {(quoteTransaction.onchain.expectedAmountUsd || 0).toFixed(6)}{" "}
                            {quoteTransaction.onchain.tokenSymbol || "USDC"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-white/65">Treasury wallet</span>
                          <span className="font-mono text-white/80">
                            {shortAddress(String(quoteTransaction.onchain.treasuryAddress || ""))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </DetailsDisclosure>
              </div>

              <PinKeyboardInput
                value={normalizePin(pin)}
                onChange={setPin}
                length={PIN_LENGTH}
                disabled={busy}
                label="Enter your PIN to approve"
                helperText="This helps protect your money."
                errorText={null}
                className="bg-black/25"
              />

              {!canSignIntent && (
                <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-100">
                  <p>Wallet signer not ready. Reconnect wallet before confirming.</p>
                  <button
                    type="button"
                    onClick={handleReconnectWallet}
                    disabled={busy || isConnecting || isAutoConnecting}
                    className="mt-2 rounded-lg border border-amber-200/30 bg-amber-500/20 px-3 py-1.5 font-medium hover:bg-amber-500/30 disabled:opacity-60"
                  >
                    {isConnecting || isAutoConnecting ? "Connecting..." : "Reconnect wallet"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmAndSend}
                disabled={
                  busy ||
                  isConnecting ||
                  isAutoConnecting ||
                  !canSignIntent ||
                  normalizePin(pin).length !== PIN_LENGTH
                }
                className="w-full rounded-xl border border-emerald-300/20 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {busy
                  ? "Submitting..."
                  : !canSignIntent
                    ? "Reconnect wallet to continue"
                    : mode === "cashout"
                      ? "Confirm cash out"
                      : "Confirm payment"}
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
                Waiting for M-Pesa confirmation. This can take up to a minute.
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
                  <span>Amount</span>
                  <strong>{formatKsh(resultTransaction.quote.totalDebitKes, { maximumFractionDigits: 2 })}</strong>
                </div>

                {resultTransaction.flowType === "offramp" && resultTransaction.targets.phoneNumber && (
                  <div className="mt-1 flex justify-between text-white/70">
                    <span>To M-Pesa</span>
                    <span className="font-mono">{resultTransaction.targets.phoneNumber}</span>
                  </div>
                )}

                {resultTransaction.flowType === "paybill" && (
                  <>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>PayBill</span>
                      <span className="font-mono">{resultTransaction.targets.paybillNumber || "-"}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Account ref</span>
                      <span className="truncate text-right text-white/80">{resultTransaction.targets.accountReference || "-"}</span>
                    </div>
                  </>
                )}

                {resultTransaction.flowType === "buygoods" && (
                  <>
                    <div className="mt-1 flex justify-between text-white/70">
                      <span>Till</span>
                      <span className="font-mono">{resultTransaction.targets.tillNumber || "-"}</span>
                    </div>
                    {resultTransaction.targets.accountReference && (
                      <div className="mt-1 flex justify-between text-white/70">
                        <span>Reference</span>
                        <span className="truncate text-right text-white/80">{resultTransaction.targets.accountReference}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-1 flex justify-between text-white/70">
                  <span>M-Pesa receipt</span>
                  <span>{resultTransaction.daraja.receiptNumber || "-"}</span>
                </div>
                <div className="mt-1 flex justify-between text-white/70">
                  <span>Result</span>
                  <span className="max-w-[60%] text-right text-white/80">
                    {resultTransaction.daraja.resultDesc || "-"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => shareReceipt(resultTransaction)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10"
                >
                  Share receipt
                </button>
                <button
                  type="button"
                  onClick={resetFlow}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10"
                >
                  New payment
                </button>
              </div>

              <DetailsDisclosure label="Details" className="bg-black/25">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Transaction ID</span>
                    <span className="font-mono text-white/80">{resultTransaction.transactionId}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Flow</span>
                    <span className="text-white/80">{resultTransaction.flowType}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Status</span>
                    <span className="text-white/80">{resultTransaction.status}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Funding TX</span>
                    <span className="font-mono text-white/80">
                      {resultTransaction.onchain?.txHash ? shortAddress(resultTransaction.onchain.txHash) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/65">Result code</span>
                    <span className="text-white/80">
                      {resultTransaction.daraja.resultCode ?? resultTransaction.daraja.resultCodeRaw ?? "-"}
                    </span>
                  </div>
                  {resultTransaction.refund?.status !== "none" && (
                    <div className="flex justify-between gap-3">
                      <span className="text-white/65">Refund</span>
                      <span className="max-w-[60%] text-right text-white/80">
                        {resultTransaction.refund.status}
                        {resultTransaction.refund.reason ? `: ${resultTransaction.refund.reason}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </DetailsDisclosure>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Timeline</p>
                <div className="space-y-2">
                  {resultTransaction.history?.map((item, idx) => (
                    <div
                      key={`${item.to}-${idx}`}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span>{timelineLabel(item.to)}</span>
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
