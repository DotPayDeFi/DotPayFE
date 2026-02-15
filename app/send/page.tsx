"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getContract, waitForReceipt } from "thirdweb";
import { getBalance, transfer } from "thirdweb/extensions/erc20";
import { toUnits } from "thirdweb/utils";
import {
  useActiveAccount,
  useConnectModal,
  useIsAutoConnecting,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import AuthGuard from "@/components/auth/AuthGuard";
import { MpesaSendModePage } from "@/components/mpesa/MpesaSendModePage";
import { isBackendApiConfigured, lookupUserFromBackend } from "@/lib/backendUser";
import { getDotPayNetwork, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import { getDotPayAccountAbstraction } from "@/lib/thirdwebAccountAbstraction";
import { thirdwebClient } from "@/lib/thirdwebClient";
import { useKesRate } from "@/hooks/useKesRate";

// Circle's official USDC (proxy) on Arbitrum Sepolia.
// Source: Circle "USDC Contract Addresses" docs.
const USDC_ARBITRUM_SEPOLIA_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;
// Circle native USDC on Arbitrum One (mainnet).
const USDC_ARBITRUM_ONE_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const USDC_DECIMALS = 6;

type RecipientKind = "dotpay" | "wallet" | "email" | "phone";
type Step = "compose" | "review" | "success";
type AmountCurrency = "KES" | "USD";

type ResolvedRecipient = {
  address: string;
  username: string | null;
  dotpayId: string | null;
  displayName: string;
};

const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isLikelyEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const normalizePhone = (value: string) => value.trim().replace(/[\s()-]/g, "");
const isLikelyPhone = (value: string) => {
  const v = normalizePhone(value);
  const digits = v.replace(/[^0-9]/g, "");
  return digits.length >= 7;
};
const normalizeAmountInput = (value: string) => value.trim().replace(/,/g, "");
const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
const titleForKind = (kind: RecipientKind) => {
  if (kind === "dotpay") return "DotPay ID";
  if (kind === "wallet") return "Wallet address";
  if (kind === "email") return "Email";
  return "Phone";
};
const placeholderForKind = (kind: RecipientKind) => {
  if (kind === "dotpay") return "DP123456789";
  if (kind === "wallet") return "0x…";
  if (kind === "email") return "name@example.com";
  return "+2547…";
};

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = (searchParams?.get("mode") || "").trim().toLowerCase();
  const mpesaMode =
    modeParam === "cashout" || modeParam === "paybill" || modeParam === "buygoods"
      ? modeParam
      : null;

  const queryClient = useQueryClient();
  const account = useActiveAccount();
  const isAutoConnecting = useIsAutoConnecting();
  const { connect, isConnecting } = useConnectModal();
  const { data: kesRate } = useKesRate();
  const kesPerUsd = kesRate?.kesPerUsd ?? 155;
  const dotpayNetwork = getDotPayNetwork();
  const enableTestnets = dotpayNetwork === "sepolia";
  const chain = getDotPayUsdcChain(dotpayNetwork);
  const accountAbstraction = useMemo(() => getDotPayAccountAbstraction(chain), [chain]);
  const usdcAddress =
    dotpayNetwork === "sepolia" ? USDC_ARBITRUM_SEPOLIA_ADDRESS : USDC_ARBITRUM_ONE_ADDRESS;

  const [step, setStep] = useState<Step>("compose");
  const [recipientKind, setRecipientKind] = useState<RecipientKind>("dotpay");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientResolved, setRecipientResolved] = useState<ResolvedRecipient | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<
    "idle" | "invalid" | "resolving" | "resolved" | "not_found" | "error"
  >("idle");
  const [recipientMessage, setRecipientMessage] = useState<string | null>(null);

  const [amountInput, setAmountInput] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<AmountCurrency>("KES");
  const [noteInput, setNoteInput] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "submitted" | "confirmed">("idle");
  const [showReconnectCta, setShowReconnectCta] = useState(false);

  const usdcContract = useMemo(
    () =>
      getContract({
        client: thirdwebClient,
        chain,
        address: usdcAddress,
      }),
    [chain, usdcAddress]
  );

  const {
    data: usdcBalance,
    isLoading: usdcBalanceLoading,
    refetch: refetchUsdcBalance,
  } = useReadContract(getBalance, {
    contract: usdcContract,
    address: account?.address ?? ZERO_ADDRESS,
    queryOptions: {
      enabled: Boolean(account?.address),
    },
  });

  const kesBalance = useMemo(() => {
    const raw = usdcBalance?.displayValue;
    if (!raw) return null;
    const usdc = Number.parseFloat(raw);
    if (!Number.isFinite(usdc)) return null;
    return usdc * kesPerUsd;
  }, [kesPerUsd, usdcBalance?.displayValue]);

  const formatKes = useCallback(
    (value: number) =>
      `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value)}`,
    []
  );

  const formatUsdc = useCallback(
    (value: number) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value),
    []
  );

  const toFixedTrim = useCallback((value: number, decimals: number) => {
    const fixed = value.toFixed(decimals);
    return fixed.replace(/\.?0+$/, "");
  }, []);

  const { mutateAsync: sendTx, isPending: isSending } = useSendTransaction({
    // Testnet: disable pay modal so failures are explicit (insufficient gas / token balance, etc.)
    payModal: false,
  });

  // Avoid flicker on refresh: auto-connect can complete quickly. Only show the reconnect CTA
  // if still disconnected after a short grace period.
  useEffect(() => {
    if (account?.address) {
      setShowReconnectCta(false);
      return;
    }

    if (isAutoConnecting) {
      setShowReconnectCta(false);
      return;
    }

    const t = setTimeout(() => setShowReconnectCta(true), 650);
    return () => clearTimeout(t);
  }, [account?.address, isAutoConnecting]);

  const handleConnectWallet = useCallback(async () => {
    try {
      const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      await connect({
        client: thirdwebClient,
        chain,
        chains: [chain],
        accountAbstraction,
        // Let modal decide wallets (uses defaults + installed), keeping UI consistent with ConnectButton.
        wallets: undefined,
        recommendedWallets: undefined,
        showAllWallets: false,
        appMetadata: {
          name: "DotPay",
          url: "https://app.dotpay.xyz",
          description: "Stablecoin wallet for fast crypto payments.",
          logoUrl: "https://app.dotpay.xyz/icons/icon-192x192.png",
        },
        theme: "dark",
        size: "compact",
        title: "Reconnect your account",
        walletConnect: walletConnectProjectId ? { projectId: walletConnectProjectId } : undefined,
      });
      toast.success("Account connected");
    } catch {
      // User closed modal or connect failed; keep message short to avoid noise.
      toast.error("Connection not completed");
    }
  }, [accountAbstraction, chain, connect]);

  const lookupSeqRef = useRef(0);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefilledRef = useRef(false);

  // Optional deep link support (used by the Receive page).
  // Example: /send?kind=wallet&to=0x...&amount=1000&currency=KES&note=Lunch
  useEffect(() => {
    if (prefilledRef.current) return;

    const kindRaw = (searchParams?.get("kind") || searchParams?.get("recipientKind") || "")
      .trim()
      .toLowerCase();
    const toRaw = (searchParams?.get("to") || searchParams?.get("recipient") || "").trim();
    const amountRaw = (searchParams?.get("amount") || "").trim();
    const currencyRaw = (searchParams?.get("currency") || "").trim().toUpperCase();
    const noteRaw = (searchParams?.get("note") || "").trim();

    if (!kindRaw && !toRaw && !amountRaw && !currencyRaw && !noteRaw) return;

    const isAddr = toRaw ? isEvmAddress(toRaw) : false;
    const kind =
      kindRaw === "wallet" || kindRaw === "dotpay" || kindRaw === "email" || kindRaw === "phone"
        ? (kindRaw as RecipientKind)
        : isAddr
          ? "wallet"
          : toRaw
            ? "dotpay"
            : null;

    if (kind) setRecipientKind(kind);
    if (toRaw) setRecipientInput(toRaw);

    if (currencyRaw === "KES" || currencyRaw === "USD") {
      setAmountCurrency(currencyRaw as AmountCurrency);
    }
    if (amountRaw) setAmountInput(amountRaw);

    if (noteRaw) setNoteInput(noteRaw);

    prefilledRef.current = true;
  }, [searchParams]);

  // Resolve recipient based on selected method.
  useEffect(() => {
    const q = recipientInput.trim();
    setRecipientResolved(null);
    setRecipientMessage(null);

    if (!q) {
      setRecipientStatus("idle");
      return;
    }

    // Fast path: wallet address doesn't require backend.
    if (recipientKind === "wallet") {
      if (!isEvmAddress(q)) {
        setRecipientStatus("invalid");
        setRecipientMessage("Enter a valid wallet address (0x…).");
        return;
      }

      // Optionally enrich with DotPay identity (if backend is up), but don't block.
      setRecipientStatus("resolved");
      setRecipientResolved({
        address: q,
        username: null,
        dotpayId: null,
        displayName: shortAddress(q),
      });

      if (!isBackendApiConfigured()) {
        return () => {
          if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        };
      }

      const seq = ++lookupSeqRef.current;
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = setTimeout(() => {
        lookupUserFromBackend(q).then((u) => {
          if (seq !== lookupSeqRef.current) return;
          if (!u?.address) return;
          const displayName = u.username ? `@${u.username}` : u.dotpayId || shortAddress(u.address);
          setRecipientResolved({
            address: u.address,
            username: u.username ?? null,
            dotpayId: u.dotpayId ?? null,
            displayName,
          });
        });
      }, 350);

      return () => {
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
      };
    }

    // Validate by kind before calling backend.
    if (recipientKind === "email" && !isLikelyEmail(q)) {
      setRecipientStatus("invalid");
      setRecipientMessage("Enter a valid email address.");
      return;
    }

    if (recipientKind === "phone" && !isLikelyPhone(q)) {
      setRecipientStatus("invalid");
      setRecipientMessage("Enter a valid phone number.");
      return;
    }

    if (recipientKind === "dotpay") {
      const looksLikeDotpayId = /^dp\d{6,}$/i.test(q);
      if (!looksLikeDotpayId) {
        setRecipientStatus("invalid");
        setRecipientMessage("Enter a DotPay ID (DP…).");
        return;
      }
    }

    if (!isBackendApiConfigured()) {
      setRecipientStatus("error");
      setRecipientMessage("Recipient lookup is unavailable (backend not configured).");
      return;
    }

    setRecipientStatus("resolving");
    const seq = ++lookupSeqRef.current;
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(() => {
      lookupUserFromBackend(q)
        .then((u) => {
          if (seq !== lookupSeqRef.current) return;
          if (!u?.address) {
            setRecipientStatus("not_found");
            setRecipientMessage("No DotPay user found for that identifier.");
            return;
          }
          const displayName =
            recipientKind === "dotpay"
              ? u.dotpayId || (u.username ? `@${u.username}` : shortAddress(u.address))
              : u.username
                ? `@${u.username}`
                : u.dotpayId || shortAddress(u.address);
          setRecipientResolved({
            address: u.address,
            username: u.username ?? null,
            dotpayId: u.dotpayId ?? null,
            displayName,
          });
          setRecipientStatus("resolved");
        })
        .catch((err) => {
          if (seq !== lookupSeqRef.current) return;
          console.error("Recipient lookup failed:", err);
          setRecipientStatus("error");
          setRecipientMessage("Could not lookup recipient. Try again.");
        });
    }, 350);

    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, [recipientInput, recipientKind]);

  const amountUsdcString = useMemo(() => {
    const normalized = normalizeAmountInput(amountInput);
    if (!normalized) return null;

    if (amountCurrency === "USD") return normalized;

    const kes = Number.parseFloat(normalized);
    if (!Number.isFinite(kes) || kes <= 0) return null;
    if (!Number.isFinite(kesPerUsd) || kesPerUsd <= 0) return null;

    const usdc = kes / kesPerUsd;
    if (!Number.isFinite(usdc) || usdc <= 0) return null;

    // USDC has 6 decimals; keep a stable string for toUnits.
    return toFixedTrim(usdc, 6);
  }, [amountCurrency, amountInput, kesPerUsd, toFixedTrim]);

  const amountUsdc = useMemo(() => {
    if (!amountUsdcString) return null;
    const n = Number.parseFloat(amountUsdcString);
    return Number.isFinite(n) ? n : null;
  }, [amountUsdcString]);

  const amountKes = useMemo(() => {
    const normalized = normalizeAmountInput(amountInput);
    if (!normalized) return null;
    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n <= 0) return null;

    if (!Number.isFinite(kesPerUsd) || kesPerUsd <= 0) return null;

    if (amountCurrency === "KES") return n;
    return n * kesPerUsd;
  }, [amountCurrency, amountInput, kesPerUsd]);

  const amountWei = useMemo(() => {
    if (!amountUsdcString) return null;
    try {
      return toUnits(amountUsdcString, usdcBalance?.decimals ?? USDC_DECIMALS);
    } catch {
      return null;
    }
  }, [amountUsdcString, usdcBalance?.decimals]);

  const amountError = useMemo(() => {
    const normalized = normalizeAmountInput(amountInput);
    if (!normalized) return null;
    if (amountWei === null) return "Enter a valid amount.";
    if (amountWei <= BigInt(0)) return "Amount must be greater than 0.";
    if (usdcBalance && amountWei > usdcBalance.value) return "Insufficient balance.";
    return null;
  }, [amountInput, amountWei, usdcBalance]);

  const note = useMemo(() => {
    const trimmed = noteInput.trim().replace(/\s+/g, " ");
    if (!trimmed) return null;
    return trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
  }, [noteInput]);

  const handleAmountCurrencyChange = useCallback(
    (next: AmountCurrency) => {
      if (next === amountCurrency) return;

      if (!amountInput.trim()) {
        setAmountCurrency(next);
        return;
      }

      if (next === "KES") {
        if (typeof amountKes === "number" && Number.isFinite(amountKes)) {
          setAmountInput(String(Math.round(amountKes)));
        }
        setAmountCurrency(next);
        return;
      }

      if (typeof amountUsdc === "number" && Number.isFinite(amountUsdc)) {
        setAmountInput(toFixedTrim(amountUsdc, 2));
      }
      setAmountCurrency(next);
    },
    [amountCurrency, amountInput, amountKes, amountUsdc, toFixedTrim]
  );

  const handleSetMaxAmount = useCallback(() => {
    if (!usdcBalance?.displayValue) return;

    if (amountCurrency === "USD") {
      setAmountInput(usdcBalance.displayValue);
      return;
    }

    const usdc = Number.parseFloat(usdcBalance.displayValue);
    if (!Number.isFinite(usdc) || !Number.isFinite(kesPerUsd) || kesPerUsd <= 0) return;
    const kesMax = Math.floor(usdc * kesPerUsd);
    setAmountInput(String(kesMax));
  }, [amountCurrency, kesPerUsd, usdcBalance?.displayValue]);

  const selfSend = Boolean(
    account?.address && recipientResolved?.address && recipientResolved.address.toLowerCase() === account.address.toLowerCase()
  );

  const canContinue =
    Boolean(account?.address) &&
    recipientStatus === "resolved" &&
    Boolean(recipientResolved?.address) &&
    !selfSend &&
    Boolean(amountWei && amountWei > BigInt(0)) &&
    !amountError;

  const handleContinue = useCallback(() => {
    if (!account?.address) {
      toast.error("Reconnect your account to continue.");
      return;
    }
    if (recipientStatus !== "resolved" || !recipientResolved?.address) {
      toast.error("Choose a valid recipient.");
      return;
    }
    if (selfSend) {
      toast.error("You can’t send to yourself.");
      return;
    }
    if (!amountWei || amountWei <= BigInt(0) || amountError) {
      toast.error(amountError ?? "Enter a valid amount.");
      return;
    }
    setStep("review");
  }, [account?.address, amountError, amountWei, recipientResolved?.address, recipientStatus, selfSend]);

  const handleSubmit = useCallback(
    async () => {
      if (!account?.address) {
        toast.error("No active connection. Please reconnect and try again.");
        return;
      }
      if (recipientStatus !== "resolved" || !recipientResolved?.address) {
        toast.error("Recipient not resolved.");
        return;
      }
      if (selfSend) {
        toast.error("You can’t send to yourself.");
        return;
      }
      if (!amountWei || amountWei <= BigInt(0) || amountError) {
        toast.error(amountError ?? "Enter a valid amount.");
        return;
      }

      try {
        setTxHash(null);
        setTxStatus("idle");
        const tx = transfer({
          contract: usdcContract,
          to: recipientResolved.address,
          amountWei, // avoid extra decimals lookup
        });

        const result = await sendTx(tx);
        setTxHash(result.transactionHash);
        setTxStatus("submitted");
        toast.success("Payment sent.");
        refetchUsdcBalance();
        queryClient.invalidateQueries({ queryKey: ["onchain-activity"] });
        setStep("success");

        const notifyRecipient = async (options?: { toastOnFailure?: boolean }) => {
          try {
            const res = await fetch("/api/notifications/payment", {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                toAddress: recipientResolved.address,
                txHash: result.transactionHash,
                note,
              }),
            });
            const payload = await res.json().catch(() => null);
            if (!res.ok || !payload?.success) {
              if (options?.toastOnFailure && note) {
                toast.error(payload?.message || "Couldn't deliver note to recipient.");
              }
              return false;
            }
            return true;
          } catch {
            if (options?.toastOnFailure && note) {
              toast.error("Couldn't deliver note to recipient.");
            }
            return false;
          }
        };

        // Fire-and-forget; if the receipt isn't indexed yet, we'll retry after confirmation below.
        notifyRecipient();

        // Best-effort: confirm on-chain. (User can always check explorer link.)
        waitForReceipt({
          chain,
          client: thirdwebClient,
          transactionHash: result.transactionHash,
        })
          .then(async () => {
            setTxStatus("confirmed");
            await notifyRecipient({ toastOnFailure: Boolean(note) });
          })
          .catch(() => {
            // Keep as "submitted" if confirmation fails (RPC hiccup, user closed tab, etc.)
          });
      } catch (error: any) {
        toast.error(error?.message ?? "Payment failed.");
      }
    },
    [
      account?.address,
      amountError,
      amountWei,
      recipientResolved,
      recipientStatus,
      refetchUsdcBalance,
      selfSend,
      sendTx,
      usdcContract,
      queryClient,
      note,
    ]
  );

  const onExplorer = txHash
    ? enableTestnets
      ? `https://sepolia.arbiscan.io/tx/${txHash}`
      : `https://arbiscan.io/tx/${txHash}`
    : null;
  const walletMissing = !account?.address;

  const resetFlow = useCallback(() => {
    setStep("compose");
    setRecipientKind("dotpay");
    setRecipientInput("");
    setRecipientResolved(null);
    setRecipientStatus("idle");
    setRecipientMessage(null);
    setAmountInput("");
    setAmountCurrency("KES");
    setNoteInput("");
    setTxHash(null);
    setTxStatus("idle");
  }, []);

  if (mpesaMode) {
    return (
      <AuthGuard redirectTo="/onboarding">
        <MpesaSendModePage mode={mpesaMode} onBack={() => router.push("/home")} />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 py-5 text-white !justify-start">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-white/60">Send</p>
              <h1 className="text-xl font-semibold">USDC</h1>
            </div>
          </header>

          <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Available balance</p>
                <p className="mt-1 text-xs text-white/60">
                  Transfers usually complete in a few seconds.
                </p>
                {typeof kesBalance === "number" && (
                  <p className="mt-1 text-xs text-white/60">
                    ≈ {formatKes(kesBalance)}
                  </p>
                )}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                {usdcBalanceLoading
                  ? "Checking balance…"
                  : usdcBalance
                  ? `${usdcBalance.displayValue} USDC`
                  : walletMissing
                  ? "Connect to view balance"
                  : "Balance unavailable"}
              </div>
            </div>

            {walletMissing && showReconnectCta && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-2 text-cyan-100">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Reconnect your account</p>
                    <p className="mt-1 text-xs text-white/60">
                      You&apos;re signed in, but we need to reconnect securely before you can send a payment.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={isConnecting || isAutoConnecting}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {isConnecting || isAutoConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reconnecting…
                    </>
                  ) : (
                    "Reconnect"
                  )}
                </button>
              </div>
            )}
          </article>

          {step === "compose" && (
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">To</p>
                  <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
                    {(
                      [
                        { id: "dotpay", label: "DotPay" },
                        { id: "wallet", label: "Wallet" },
                        { id: "email", label: "Email" },
                        { id: "phone", label: "Phone" },
                      ] as const
                    ).map((tab) => {
                      const selected = recipientKind === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setRecipientKind(tab.id);
                            setRecipientInput("");
                            setRecipientResolved(null);
                            setRecipientStatus("idle");
                            setRecipientMessage(null);
                          }}
                          className={`rounded-lg px-2 py-2 font-semibold transition ${
                            selected
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">{titleForKind(recipientKind)}</label>
                      {recipientKind !== "wallet" && (
                        <span className="text-xs text-white/50">Looks up a DotPay account</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                      <Search className="h-4 w-4 text-white/40" />
                      <input
                        value={recipientInput}
                        onChange={(e) => setRecipientInput(e.target.value)}
                        placeholder={placeholderForKind(recipientKind)}
                        inputMode={recipientKind === "phone" ? "tel" : recipientKind === "email" ? "email" : "text"}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none ${
                          recipientKind === "wallet" ? "font-mono" : ""
                        }`}
                      />
                      {recipientStatus === "resolving" && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
                      {recipientStatus === "resolved" && <CheckCircle2 className="h-4 w-4 text-cyan-200" />}
                      {(recipientStatus === "invalid" || recipientStatus === "not_found" || recipientStatus === "error") && (
                        <XCircle className="h-4 w-4 text-amber-200" />
                      )}
                    </div>

                    {recipientMessage && (
                      <p className="mt-2 text-xs text-amber-100/90">{recipientMessage}</p>
                    )}

                    {selfSend && (
                      <p className="mt-2 text-xs text-amber-100/90">This resolves to your own account.</p>
                    )}

                    {recipientResolved && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{recipientResolved.displayName}</p>
                            <p className="mt-0.5 truncate font-mono text-xs text-white/60">
                              {shortAddress(recipientResolved.address)}
                              {recipientKind === "dotpay"
                                ? recipientResolved.username
                                  ? ` · @${recipientResolved.username}`
                                  : ""
                                : recipientResolved.dotpayId
                                  ? ` · ${recipientResolved.dotpayId}`
                                  : ""}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/70">
                            Recipient
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-white/60">Amount</p>
                    <div className="flex items-center gap-2">
                      <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => handleAmountCurrencyChange("KES")}
                          className={`rounded-lg px-2 py-1.5 transition ${
                            amountCurrency === "KES"
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          KES
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAmountCurrencyChange("USD")}
                          className={`rounded-lg px-2 py-1.5 transition ${
                            amountCurrency === "USD"
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          USD
                        </button>
                      </div>

                      {usdcBalance && (
                        <button
                          type="button"
                          onClick={handleSetMaxAmount}
                          className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                        >
                          Max
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-semibold text-white/80">
                      {amountCurrency}
                    </div>
                    <input
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder={amountCurrency === "KES" ? "0" : "0.00"}
                      inputMode="decimal"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                    />
                  </div>

                  {amountError && <p className="mt-2 text-xs text-amber-100/90">{amountError}</p>}
                  {!amountError && amountCurrency === "USD" && typeof amountKes === "number" && (
                    <p className="mt-2 text-xs text-white/60">≈ {formatKes(amountKes)}</p>
                  )}
                  {!amountError && amountCurrency === "KES" && typeof amountUsdc === "number" && (
                    <p className="mt-2 text-xs text-white/60">≈ {formatUsdc(amountUsdc)} USDC</p>
                  )}

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {(amountCurrency === "KES" ? [200, 500, 1000, 2000] : [10, 25, 50, 100]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmountInput(String(v))}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-white/60">Note (optional)</p>
                    <span className="text-xs text-white/45">{noteInput.length}/180</span>
                  </div>
                  <div className="mt-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="What’s this for?"
                      rows={2}
                      maxLength={180}
                      className="w-full resize-none bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-white/55">
                    Shown to the recipient in notifications.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue || isSending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </article>
          )}

          {step === "review" && (
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">Review</p>
                  <h2 className="mt-2 text-lg font-semibold">Confirm payment</h2>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-white/60">Recipient</p>
                      <p className="mt-1 truncate text-sm font-semibold">{recipientResolved?.displayName ?? "—"}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-white/60">
                        {recipientResolved?.address ? shortAddress(recipientResolved.address) : "—"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/70">
                      USDC
                    </span>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-xs text-white/60">Amount</p>
                    <p className="mt-1 text-2xl font-bold">
                      {typeof amountKes === "number" ? formatKes(amountKes) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      {typeof amountUsdc === "number" ? `${formatUsdc(amountUsdc)} USDC` : "—"}
                    </p>
                  </div>

                  {note && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <p className="text-xs text-white/60">Note</p>
                      <p className="mt-1 text-sm text-white/85">{note}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg border border-white/10 bg-black/20 p-2 text-white/70">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-xs text-white/60">
                      Double-check the recipient and amount. Payments can&apos;t be reversed once confirmed.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("compose")}
                    disabled={isSending}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSending || walletMissing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send USDC"
                    )}
                  </button>
                </div>
              </div>
            </article>
          )}

          {step === "success" && (
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-2 text-cyan-100">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-white/60">Payment sent</p>
                      <h2 className="mt-1 text-lg font-semibold">
                        {typeof amountKes === "number"
                          ? formatKes(amountKes)
                          : typeof amountUsdc === "number"
                            ? `${formatUsdc(amountUsdc)} USDC`
                            : "Payment sent"}
                      </h2>
                      {typeof amountKes === "number" && typeof amountUsdc === "number" && (
                        <p className="mt-1 text-xs text-white/60">
                          {formatUsdc(amountUsdc)} USDC
                        </p>
                      )}
                      <p className="mt-1 text-xs text-white/60">
                        To {recipientResolved?.displayName ?? "recipient"}
                      </p>
                      {note && (
                        <p className="mt-1 text-xs text-white/60">
                          Note: {note}
                        </p>
                      )}
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                      {txStatus === "confirmed" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-cyan-200" />
                          Confirmed
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
                          Pending confirmation
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {txHash && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Reference</p>
                    <p className="mt-1 break-all font-mono text-xs text-white/80">{txHash}</p>
                    {onExplorer && (
                      <a
                        href={onExplorer}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                      >
                        View receipt <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
                  >
                    Send another
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/home")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25"
                  >
                    Done
                  </button>
                </div>
              </div>
            </article>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
