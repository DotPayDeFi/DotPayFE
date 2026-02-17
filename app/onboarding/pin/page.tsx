"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import AuthHandoff from "@/components/auth/AuthHandoff";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  setUserPin,
  syncUserToBackend,
  type BackendUserRecord,
} from "@/lib/backendUser";
import { PinKeypad } from "@/components/ui/PinKeypad";

const PIN_LENGTH = 6;

const redirectTo = (path: string) => {
  if (typeof window !== "undefined") {
    window.location.assign(path);
  }
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, PIN_LENGTH);
}

export default function PinOnboardingPage() {
  const { address, sessionUser, isLoggedIn, hasChecked } = useAuthSession();

  const walletAddress = useMemo(
    () => sessionUser?.address || address || null,
    [address, sessionUser?.address]
  );

  const backendConfigured = isBackendApiConfigured();

  const [checkingProfile, setCheckingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BackendUserRecord | null>(null);

  const [phase, setPhase] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const normalizedPin = useMemo(() => normalizeDigits(pin), [pin]);
  const normalizedConfirm = useMemo(() => normalizeDigits(confirmPin), [confirmPin]);
  const pinsMatch = normalizedPin.length === PIN_LENGTH && normalizedPin === normalizedConfirm;

  useEffect(() => {
    if (hasChecked && !isLoggedIn) {
      redirectTo("/onboarding");
    }
  }, [hasChecked, isLoggedIn]);

  const hydrateState = useCallback(async () => {
    if (!walletAddress) return;

    if (!backendConfigured) {
      // Without the backend, PIN setup can't function; keep UX unblocked.
      setReady(true);
      setError("Security PIN setup is unavailable because the backend API is not configured.");
      return;
    }

    setCheckingProfile(true);
    setError(null);

    try {
      let user = await getUserFromBackend(walletAddress);

      if (!user && sessionUser) {
        await syncUserToBackend(sessionUser);
        user = await getUserFromBackend(walletAddress);
      }

      setProfile(user);

      if (user?.pinSet) {
        // If PIN already set, continue onboarding if needed, otherwise go home.
        if (user?.username) {
          redirectTo("/home");
          return;
        }
        redirectTo("/onboarding/identity");
        return;
      }

      setReady(true);
    } catch {
      // Allow user to proceed to set PIN even if profile lookup fails.
      setReady(true);
    } finally {
      setCheckingProfile(false);
    }
  }, [backendConfigured, sessionUser, walletAddress]);

  useEffect(() => {
    if (!hasChecked) return;
    if (!isLoggedIn) return;
    hydrateState();
  }, [hasChecked, hydrateState, isLoggedIn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!walletAddress) {
      setError("Account not detected. Please reconnect and try again.");
      return;
    }
    if (!backendConfigured) {
      setError("Security PIN setup is unavailable right now.");
      return;
    }

    const nextPin = normalizeDigits(pin);
    const nextConfirm = normalizeDigits(confirmPin);

    if (nextPin.length !== PIN_LENGTH) {
      setError(`PIN must be exactly ${PIN_LENGTH} digits.`);
      return;
    }
    if (nextPin !== nextConfirm) {
      setError("PINs do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await setUserPin(walletAddress, nextPin);
      toast.success("Security PIN set");

      // Continue onboarding if username isn't set yet.
      const usernameSet = Boolean(profile?.username);
      redirectTo(usernameSet ? "/home" : "/onboarding/identity");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set PIN. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasChecked && !isLoggedIn) {
    return (
      <AuthHandoff variant="onboarding" title="Session expired" subtitle="Redirecting you to sign in..." />
    );
  }

  if (!ready || checkingProfile || !walletAddress) {
    return (
      <AuthHandoff
        variant="onboarding"
        title="Securing your DotPay account"
        subtitle={
          !walletAddress
            ? "Finalizing secure sign-in..."
            : checkingProfile
              ? "Checking your account..."
              : "Preparing your next step..."
        }
      />
    );
  }

  if (!backendConfigured) {
    return (
      <main className="app-background min-h-screen px-4 py-8 text-white">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Security</p>
          <h1 className="mt-2 text-2xl font-bold">Temporarily unavailable</h1>
          <p className="mt-2 text-sm text-white/75">
            Your session is active, but security setup needs the backend API configured.
          </p>
          {error && (
            <p className="mt-4 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => redirectTo("/home")}
            className="mt-6 w-full rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            Continue to DotPay
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-background min-h-screen px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-black/40 p-6">
        <header className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => redirectTo("/onboarding")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Security</p>
            <h1 className="mt-1 text-xl font-bold">Set your PIN</h1>
          </div>
        </header>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mt-0.5 rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Approve payments with your PIN</p>
            <p className="mt-1 text-xs text-white/65">
              You’ll use this {PIN_LENGTH}-digit PIN to approve M-Pesa payments and cashouts.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {phase === "create" && (
            <>
              <PinKeypad
                value={normalizedPin}
                onChange={(v) => {
                  setError(null);
                  setPin(v);
                }}
                length={PIN_LENGTH}
                disabled={submitting}
                label="Create a 6-digit PIN"
                helperText="Use a new PIN that you don’t use anywhere else."
                errorText={error}
                className="bg-black/25"
              />

              <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white/85">
                  Why do I need this?
                </summary>
                <p className="mt-2 text-xs text-white/65">
                  It helps protect your money if someone gets access to your phone session. We’ll ask
                  for your PIN before cashouts and merchant payments.
                </p>
              </details>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/55">PIN tips</p>
                <p className="mt-2 text-xs text-white/70">Do not reuse your M-Pesa PIN</p>
                <p className="mt-1 text-xs text-white/70">Avoid birthdays</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (normalizedPin.length !== PIN_LENGTH) {
                    setError(`PIN must be exactly ${PIN_LENGTH} digits.`);
                    return;
                  }
                  setError(null);
                  setPhase("confirm");
                }}
                disabled={submitting}
                className="w-full rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
              >
                Continue
              </button>
            </>
          )}

          {phase === "confirm" && (
            <>
              <PinKeypad
                value={normalizedConfirm}
                onChange={(v) => {
                  setError(null);
                  setConfirmPin(v);
                }}
                length={PIN_LENGTH}
                disabled={submitting}
                label="Confirm your PIN"
                helperText="Re-enter your PIN to confirm."
                errorText={error}
                className="bg-black/25"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setConfirmPin("");
                    setPhase("create");
                  }}
                  disabled={submitting}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !pinsMatch}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {submitting ? "Saving PIN..." : "Save PIN"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
