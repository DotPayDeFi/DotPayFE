"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "thirdweb/react";
import type { LoginPayload, VerifyLoginPayloadParams } from "thirdweb/auth";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { getDotPayNetwork, getDotPaySupportedChains, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import { thirdwebClient } from "@/lib/thirdwebClient";
import { generatePayload, login } from "@/app/(auth)/actions/login";
import { useAuthSession } from "@/context/AuthSessionContext";

type ThirdwebConnectButtonProps = {
  mode?: "login" | "signup";
};

export const ThirdwebConnectButton: React.FC<ThirdwebConnectButtonProps> = ({ mode = "login" }) => {
  const router = useRouter();
  const { isLoggedIn, hasChecked } = useAuthSession();
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  const dotpayNetwork = getDotPayNetwork();

  // Default: dev -> Sepolia, prod -> Arbitrum One. Override with NEXT_PUBLIC_DOTPAY_NETWORK.
  const defaultChain = getDotPayUsdcChain(dotpayNetwork);
  const supportedChains = getDotPaySupportedChains(dotpayNetwork);

  const wallets = useMemo(
    () => [
      inAppWallet({
        auth: {
          options: ["google", "email", "phone"],
        },
      }),
      createWallet("io.metamask"),
      createWallet("com.coinbase.wallet"),
      createWallet("me.rainbow"),
    ],
    []
  );

  useEffect(() => {
    router.prefetch("/home");
    router.prefetch("/auth/finish");
    router.prefetch("/onboarding/identity");
  }, [router]);

  const getLoginPayload = useCallback(
    async (params: { address: string; chainId: number }): Promise<LoginPayload> => {
      return generatePayload({
        address: params.address,
        chainId: params.chainId,
      });
    },
    []
  );

  const doLogin = useCallback(
    async (params: VerifyLoginPayloadParams) => {
      await login(params);
      const address = params?.payload?.address ?? null;
      const nextRoute = `/auth/finish?mode=${encodeURIComponent(mode)}`;
      window.dispatchEvent(
        new CustomEvent("dotpay-auth-login", { detail: { address } })
      );
      router.replace(nextRoute);
    },
    [mode, router]
  );

  const isAuthenticated = useCallback(async () => {
    if (hasChecked) return isLoggedIn;
    try {
      const res = await fetch("/api/auth/is-logged-in", {
        cache: "no-store",
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data?.loggedIn);
    } catch {
      return false;
    }
  }, [hasChecked, isLoggedIn]);

  const doLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  return (
    <ConnectButton
      client={thirdwebClient}
      chain={defaultChain}
      chains={supportedChains}
      wallets={wallets}
      recommendedWallets={wallets}
      showAllWallets={false}
      autoConnect={{ timeout: 4000 }}
      appMetadata={{
        name: "DotPay",
        url: "https://app.dotpay.xyz",
        description: "Stablecoin wallet for fast crypto payments.",
        logoUrl: "https://app.dotpay.xyz/icons/icon-192x192.png",
      }}
      walletConnect={
        walletConnectProjectId
          ? { projectId: walletConnectProjectId }
          : undefined
      }
      auth={{
        getLoginPayload,
        doLogin,
        isLoggedIn: isAuthenticated,
        doLogout,
      }}
      connectButton={{
        label: mode === "login" ? "Continue to DotPay" : "Create your DotPay account",
        className: "!w-full !justify-center",
      }}
      theme="dark"
      connectModal={{
        title: mode === "login" ? "Sign in to DotPay" : "Create your DotPay account",
        size: "compact",
        showThirdwebBranding: false,
      }}
    />
  );
};
