"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode.react";
import { ArrowDownLeft, ChevronRight, Copy, Download, Link as LinkIcon, Share2, UserCircle2 } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { MpesaTopupPanel } from "@/components/mpesa/MpesaTopupPanel";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  syncUserToBackend,
  type BackendUserRecord,
} from "@/lib/backendUser";

type AmountCurrency = "KES" | "USD";
type ReceiveMethod = "dotpay" | "wallet";
type AddFundsTab = "choose" | "topup" | "request";

const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const normalizeAmountInput = (value: string) => value.trim().replace(/,/g, "");

export default function AddFundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, sessionUser } = useAuthSession();
  const backendConfigured = isBackendApiConfigured();

  const tabParam = (searchParams?.get("tab") || "").trim().toLowerCase();
  const tab: AddFundsTab =
    tabParam === "topup" ? "topup" : tabParam === "request" ? "request" : "choose";

  const sessionAddress = useMemo(
    () => (sessionUser?.address || "").trim().toLowerCase() || null,
    [sessionUser?.address]
  );
  const onchainAddress = useMemo(
    () => (address || sessionAddress || "").trim().toLowerCase() || null,
    [address, sessionAddress]
  );
  const profileAddress = useMemo(
    () => onchainAddress || sessionAddress || null,
    [onchainAddress, sessionAddress]
  );

  const [backendStatus, setBackendStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [backendUser, setBackendUser] = useState<BackendUserRecord | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [origin, setOrigin] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState(196);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>("wallet");

  const [amountCurrency, setAmountCurrency] = useState<AmountCurrency>("KES");
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const note = useMemo(() => {
    const trimmed = noteInput.trim().replace(/\\s+/g, " ");
    if (!trimmed) return null;
    return trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
  }, [noteInput]);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : null);
  }, []);

  useEffect(() => {
    const compute = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      if (w < 360) {
        setQrSize(144);
        return;
      }
      if (w < 420) {
        setQrSize(160);
        return;
      }
      if (w < 520) {
        setQrSize(176);
        return;
      }
      setQrSize(196);
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    if (!backendConfigured) {
      setBackendStatus("ready");
      setBackendUser(null);
      setBackendError(null);
      return;
    }
    if (!profileAddress) {
      setBackendStatus("ready");
      setBackendUser(null);
      setBackendError("No address found in your current session.");
      return;
    }

    let cancelled = false;
    setBackendStatus("loading");
    setBackendError(null);

    const load = async () => {
      try {
        let user = await getUserFromBackend(profileAddress);
        if (!user && sessionUser) {
          await syncUserToBackend(sessionUser);
          user = await getUserFromBackend(profileAddress);
        }

        if (cancelled) return;
        setBackendUser(user);
        setBackendStatus("ready");
      } catch {
        if (cancelled) return;
        setBackendUser(null);
        setBackendStatus("error");
        setBackendError("Unable to load your profile right now.");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [backendConfigured, profileAddress, sessionUser]);

  const dotpayId = useMemo(() => {
    const value = backendUser?.dotpayId;
    return value ? String(value).trim().toUpperCase() : null;
  }, [backendUser?.dotpayId]);

  const confirmationName = useMemo(() => {
    const value = backendUser?.username;
    if (!value) return null;
    return String(value).trim();
  }, [backendUser?.username]);

  useEffect(() => {
    if (backendConfigured && dotpayId) {
      setReceiveMethod("dotpay");
      return;
    }
    setReceiveMethod("wallet");
  }, [backendConfigured, dotpayId]);

  const amountError = useMemo(() => {
    const normalized = normalizeAmountInput(amountInput);
    if (!normalized) return null;
    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n <= 0) return "Enter a valid amount.";
    return null;
  }, [amountInput]);

  const requestAmount = useMemo(() => {
    const normalized = normalizeAmountInput(amountInput);
    if (!normalized) return null;
    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n <= 0) return null;
    return normalized;
  }, [amountInput]);

  const requestTo = useMemo(() => {
    if (receiveMethod === "dotpay") return dotpayId;
    return onchainAddress;
  }, [dotpayId, onchainAddress, receiveMethod]);

  const requestKind = receiveMethod === "dotpay" ? "dotpay" : "wallet";

  const requestUrl = useMemo(() => {
    if (!origin) return null;
    if (!requestTo) return null;

    const to = requestTo.trim();
    if (requestKind === "wallet" && !isEvmAddress(to)) return null;
    if (requestKind !== "wallet" && to.length < 3) return null;

    const url = new URL("/send", origin);
    url.searchParams.set("kind", requestKind);
    url.searchParams.set("to", to);

    if (requestAmount) {
      url.searchParams.set("amount", requestAmount);
      url.searchParams.set("currency", amountCurrency);
    }

    if (note) url.searchParams.set("note", note);
    return url.toString();
  }, [amountCurrency, note, origin, requestAmount, requestKind, requestTo]);

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Unable to copy");
    }
  }, []);

  const shareRequest = useCallback(async () => {
    if (!requestUrl) return;

    if (navigator.share) {
      try {
        const title = "DotPay request";
        const text = requestAmount
          ? `Requesting ${amountCurrency === "KES" ? "KSh" : "USD"} ${requestAmount} via DotPay`
          : "Requesting money via DotPay";
        await navigator.share({ title, text, url: requestUrl });
        return;
      } catch {
        // User cancelled or share failed; fallback to copying link.
      }
    }

    await copyText(requestUrl, "Request link");
  }, [amountCurrency, copyText, requestAmount, requestUrl]);

  const downloadQr = useCallback(() => {
    const canvas = document.getElementById("dotpay-request-qr") as HTMLCanvasElement | null;
    if (!canvas) {
      toast.error("QR is not ready yet");
      return;
    }
    const link = document.createElement("a");
    link.download = "DotPay-Request.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 pb-8 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-xl space-y-5">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Add Funds</p>
              <h1 className="mt-1 text-2xl font-bold">
                {tab === "topup" ? "Top up" : tab === "request" ? "Request money" : "Add funds"}
              </h1>
              <p className="mt-2 text-sm text-white/70">
                {tab === "topup"
                  ? "Initiate an M-Pesa prompt, approve on your phone, then we’ll credit your balance."
                  : tab === "request"
                    ? "Share a link or QR code. The sender can pay using a phone, DotPay ID, or a crypto wallet."
                    : "Choose how you want to add funds to your DotPay account."}
              </p>
            </div>

            {tab !== "choose" && (
              <button
                type="button"
                onClick={() => router.push("/add-funds")}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
              >
                Change
              </button>
            )}
          </header>

          {tab === "choose" && (
            <article className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5">
              <button
                type="button"
                onClick={() => router.push("/add-funds?tab=topup")}
                className="group w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-cyan-100">
                      <ArrowDownLeft className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Top up from M-Pesa</p>
                      <p className="mt-1 text-xs text-white/65">
                        Approve the prompt on your phone, then funds are added automatically.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/add-funds?tab=request")}
                className="group w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-cyan-100">
                      <LinkIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Request money</p>
                      <p className="mt-1 text-xs text-white/65">
                        Share a link or QR code so someone can pay you.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
                </div>
              </button>
            </article>
          )}

          {tab === "topup" && (
            <section aria-label="Top up">
              <MpesaTopupPanel />
            </section>
          )}

          {tab === "request" && (
            <section aria-label="Request money" className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/60">Request money</p>
                <h2 className="mt-1 text-lg font-semibold">Share a request</h2>
                <p className="mt-1 text-xs text-white/65">
                  Send a link or QR code. The sender can pay using a phone, DotPay ID, or crypto wallet.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-100">
                <LinkIcon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/70">Amount (optional)</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                    <select
                      value={amountCurrency}
                      onChange={(e) => setAmountCurrency(e.target.value === "USD" ? "USD" : "KES")}
                      className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-semibold text-white/80 outline-none"
                    >
                      <option value="KES">KSh</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      inputMode="decimal"
                      placeholder={amountCurrency === "KES" ? "0" : "0.00"}
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                    />
                  </div>
                  {amountError && <p className="mt-2 text-xs text-amber-100/90">{amountError}</p>}
                </div>

                <div>
                  <label className="text-xs text-white/70">Send to</label>
                  <div className="mt-1 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setReceiveMethod("dotpay")}
                      disabled={!dotpayId}
                      className={`rounded-lg px-2 py-2 ${
                        receiveMethod === "dotpay"
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/80"
                      } ${!dotpayId ? "opacity-50" : ""}`}
                    >
                      DotPay ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiveMethod("wallet")}
                      className={`rounded-lg px-2 py-2 ${
                        receiveMethod === "wallet"
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/80"
                      }`}
                    >
                      Crypto wallet
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/55">
                    {receiveMethod === "dotpay"
                      ? dotpayId
                        ? `Requests will be addressed to ${dotpayId}.`
                        : "Set up your DotPay ID in onboarding to enable this option."
                      : "Requests will be addressed to your crypto wallet address."}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-white/70">Note (optional)</label>
                  <span className="text-xs text-white/45">{noteInput.length}/180</span>
                </div>
                <div className="mt-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="What’s this for?"
                    rows={2}
                    maxLength={180}
                    className="w-full resize-none bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={shareRequest}
                  disabled={!requestUrl || Boolean(amountError)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" />
                  Share request
                </button>
                <button
                  type="button"
                  onClick={() => requestUrl && copyText(requestUrl, "Request link")}
                  disabled={!requestUrl || Boolean(amountError)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>
              </div>

              {requestUrl && (
                <div className="mt-2 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <QRCode
                    id="dotpay-request-qr"
                    value={requestUrl}
                    size={qrSize}
                    includeMargin
                    bgColor="#0d141b"
                    fgColor="#e6faff"
                  />
                  <button
                    type="button"
                    onClick={downloadQr}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
                  >
                    <Download className="h-4 w-4" />
                    Download QR
                  </button>
                </div>
              )}
            </div>
            </section>
          )}

          <section aria-label="Your details" className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/60">Your details</p>
                <h2 className="mt-1 text-lg font-semibold">DotPay account</h2>
                <p className="mt-1 text-xs text-white/65">
                  Share your DotPay ID or wallet address for transfers and funding.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-100">
                <UserCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-white/60">DotPay ID</p>
                    <p className="mt-1 truncate text-sm font-semibold">{dotpayId || "Not set"}</p>
                    {confirmationName && (
                      <p className="mt-0.5 text-xs text-white/60">Confirmation name: {confirmationName}</p>
                    )}
                  </div>
                  {dotpayId && (
                    <button
                      type="button"
                      onClick={() => copyText(dotpayId, "DotPay ID")}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  )}
                </div>
                {backendConfigured && backendStatus === "ready" && !dotpayId && (
                  <button
                    type="button"
                    onClick={() => router.push("/onboarding/identity")}
                    className="mt-3 w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25"
                  >
                    Set up DotPay ID
                  </button>
                )}
                {backendStatus === "error" && backendError && (
                  <p className="mt-3 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {backendError}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-white/60">Wallet address</p>
                    <p className="mt-1 break-all font-mono text-xs text-white/80">{onchainAddress || "—"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onchainAddress && copyText(onchainAddress, "Wallet address")}
                    disabled={!onchainAddress}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30 disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </AuthGuard>
  );
}
