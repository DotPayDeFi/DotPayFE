"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthHandoff from "@/components/auth/AuthHandoff";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  syncUserToBackend,
} from "@/lib/backendUser";

type FinishMode = "login" | "signup";

function parseMode(value: string | null): FinishMode {
  return value === "signup" ? "signup" : "login";
}

export default function AuthFinishPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useMemo(() => parseMode(searchParams?.get("mode") ?? null), [searchParams]);

  const { address, sessionUser, isLoggedIn, hasChecked, refresh } = useAuthSession();
  const walletAddress = address || sessionUser?.address || null;

  const [subtitle, setSubtitle] = useState("Securing your session...");

  // Ensure we have the latest server session state (JWT) before routing.
  useEffect(() => {
    if (!hasChecked) {
      refresh({ background: true }).catch(() => {});
    }
  }, [hasChecked, refresh]);

  useEffect(() => {
    if (!hasChecked) return;

    if (!isLoggedIn) {
      router.replace(mode === "signup" ? "/onboarding" : "/login");
      return;
    }

    if (!walletAddress) {
      setSubtitle("Finalizing secure sign-in...");
      return;
    }

    let cancelled = false;

    const route = async () => {
      // For login, skip onboarding checks and go straight to the app.
      if (mode === "login") {
        router.replace("/home");
        return;
      }

      setSubtitle("Loading your DotPay profile...");

      // Without the backend, identity onboarding can't function; keep UX unblocked.
      if (!isBackendApiConfigured()) {
        router.replace("/home");
        return;
      }

      try {
        let profile = await getUserFromBackend(walletAddress);

        // If the record isn't there yet (fresh wallet), sync then re-fetch once.
        if (!profile && sessionUser) {
          await syncUserToBackend(sessionUser);
          profile = await getUserFromBackend(walletAddress);
        }

        if (cancelled) return;

        if (!profile?.pinSet) {
          router.replace("/onboarding/pin");
          return;
        }

        if (profile?.username) {
          router.replace("/home");
          return;
        }

        router.replace("/onboarding/identity");
      } catch {
        if (cancelled) return;
        router.replace("/onboarding/pin");
      }
    };

    route();

    return () => {
      cancelled = true;
    };
  }, [hasChecked, isLoggedIn, mode, router, sessionUser, walletAddress]);

  return (
    <AuthHandoff
      variant={mode === "signup" ? "onboarding" : "app"}
      title="Signing you in..."
      subtitle={subtitle}
    />
  );
}
