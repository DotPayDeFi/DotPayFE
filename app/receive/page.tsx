"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode.react";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  Link as LinkIcon,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  syncUserToBackend,
  type BackendUserRecord,
} from "@/lib/backendUser";

type AmountCurrency = "KES" | "USD";
type ReceiveMethod = "dotpay" | "wallet";

const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const normalizeAmountInput = (value: string) => value.trim().replace(/,/g, "");

export default function ReceivePage() {
  const router = useRouter();
  const { address, sessionUser } = useAuthSession();
  const backendConfigured = isBackendApiConfigured();

  const profileAddress = useMemo(
    () => (sessionUser?.address || address || "").trim().toLowerCase() || null,
    [address, sessionUser?.address]
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
    const trimmed = noteInput.trim().replace(/\s+/g, " ");
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

  const username = useMemo(() => {
    const value = backendUser?.username;
    return value ? `@${String(value).trim().toLowerCase()}` : null;
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
    return profileAddress;
  }, [dotpayId, profileAddress, receiveMethod]);

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
        const title = "DotPay payment request";
        const text = requestAmount
          ? `Pay ${amountCurrency} ${requestAmount} via DotPay`
          : "Pay via DotPay";
        await navigator.share({ title, text, url: requestUrl });
        return;
      } catch {
        // User canceled or share failed; fallback to copying link.
      }
    }

    await copyText(requestUrl, "Request link");
  }, [amountCurrency, copyText, requestAmount, requestUrl]);

  const downloadQr = useCallback(() => {
    const canvas = document.getElementById("dotpay-receive-qr") as HTMLCanvasElement | null;
    if (!canvas) {
      toast.error("QR is not ready yet");
      return;
    }
    const link = document.createElement("a");
    link.download = "DotPay-Receive.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const showIdentityCta =
    backendConfigured && backendStatus === "ready" && Boolean(profileAddress) && !dotpayId;

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 pb-24 pt-6 text-white !justify-start">
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
              <p className="text-xs uppercase tracking-wide text-white/60">Receive</p>
              <h1 className="text-xl font-semibold">Get paid</h1>
            </div>
          </header>

          {showIdentityCta && (
            <article className="rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-cyan-500/15 to-sky-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-cyan-300/25 bg-black/20 p-2 text-cyan-100">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Activate your DotPay ID</p>
                  <p className="mt-1 text-xs text-white/65">
                    Set a username for confirmation. Your DotPay ID (DP...) will be created automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding/identity")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                >
                  Set up
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          )}

          <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">Your receive details</p>
                <p className="mt-1 text-xs text-white/60">
                  Share your DotPay ID (DP...) or account address. Payments complete in seconds.
                </p>
                </div>
              </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                      DotPay ID
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {backendStatus === "loading"
                        ? "Loading..."
                        : dotpayId
                          ? dotpayId
                          : "Not provisioned"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!dotpayId}
                    onClick={() => dotpayId && copyText(dotpayId, "DotPay ID")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>

                {backendError && (
                  <p className="mt-2 text-xs text-amber-100/90">{backendError}</p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                      Username (for confirmation)
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {backendStatus === "loading" ? "Loading..." : username ? username : "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                      Account address
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-white/80">
                      {profileAddress ? profileAddress : "Loading..."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!profileAddress}
                    onClick={() => profileAddress && copyText(profileAddress, "Address")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Request a payment</p>
                <p className="mt-1 text-xs text-white/60">
                  Create a link or QR code. Amount and note are optional.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1 text-[11px] font-semibold sm:w-auto sm:rounded-xl">
                <button
                  type="button"
                  onClick={() => setReceiveMethod("dotpay")}
                  disabled={!dotpayId || !backendConfigured}
                  className={`rounded-lg px-2 py-1.5 transition ${
                    receiveMethod === "dotpay"
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  } disabled:opacity-60`}
                >
                  DotPay ID
                </button>
                <button
                  type="button"
                  onClick={() => setReceiveMethod("wallet")}
                  className={`rounded-lg px-2 py-1.5 transition ${
                    receiveMethod === "wallet"
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  Wallet
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-white/60">Amount (optional)</p>
                  <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAmountCurrency("KES")}
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
                      onClick={() => setAmountCurrency("USD")}
                      className={`rounded-lg px-2 py-1.5 transition ${
                        amountCurrency === "USD"
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/80"
                      }`}
                    >
                      USD
                    </button>
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

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {(amountCurrency === "KES" ? [200, 500, 1000, 2000] : [5, 10, 25, 50]).map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmountInput(String(v))}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                      >
                        {v}
                      </button>
                    )
                  )}
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
                    placeholder="e.g. Lunch, rent, invoice #102"
                    rows={2}
                    maxLength={180}
                    className="w-full resize-none bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                  />
                </div>
                <p className="mt-2 text-xs text-white/55">
                  The sender can edit this before paying.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                      Request link
                    </p>
                    <p className="mt-1 break-all text-xs text-white/75">
                      {requestUrl ? requestUrl : "Generating..."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestUrl && copyText(requestUrl, "Request link")}
                    disabled={!requestUrl}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-black/40 disabled:opacity-60"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Copy
                  </button>
                </div>

                <div className="mt-4 flex flex-col items-center gap-3 sm:gap-4">
                  <div className="rounded-2xl bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.25)] sm:p-3">
                    {requestUrl ? (
                      <QRCode
                        id="dotpay-receive-qr"
                        value={requestUrl}
                        size={qrSize}
                        level="H"
                        renderAs="canvas"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        includeMargin
                        className="block"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center text-xs text-black/60"
                        style={{ width: qrSize, height: qrSize }}
                      >
                        Preparing QR...
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/60">
                    Scan to open DotPay and pay this request.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={shareRequest}
                    disabled={!requestUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={!requestUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!requestUrl) return;
                      try {
                        const u = new URL(requestUrl);
                        router.push(`${u.pathname}${u.search}`);
                      } catch {
                        // ignore
                      }
                    }}
                    disabled={!requestUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Preview
                  </button>
                </div>
              </div>

              {!backendConfigured && receiveMethod === "dotpay" && (
                <p className="text-xs text-amber-100/90">
                  DotPay ID requests require the backend. Switch to Wallet or configure the backend API.
                </p>
              )}
            </div>
          </article>
        </section>
      </main>
    </AuthGuard>
  );
}
