"use server";

import { cookies } from "next/headers";
import { createAuth, type VerifyLoginPayloadParams } from "thirdweb/auth";
import { getUser } from "thirdweb/wallets";
import { privateKeyToAccount } from "thirdweb/wallets";
import { thirdwebClient } from "@/lib/thirdwebClient";
import { thirdwebServerClient } from "@/lib/thirdwebServerClient";
import type { SessionUser } from "@/types/session-user";

const privateKey = process.env.AUTH_PRIVATE_KEY;
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN;

if (!privateKey) {
  throw new Error("AUTH_PRIVATE_KEY is not set. Please configure it in your environment variables.");
}

if (!domain) {
  throw new Error(
    "NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN is not set. Please configure it in your environment variables."
  );
}

const thirdwebAuth = createAuth({
  domain,
  adminAccount: privateKeyToAccount({ client: thirdwebClient, privateKey }),
  client: thirdwebClient,
});

function authMethodFromProfileType(
  type: string | undefined
): SessionUser["authMethod"] {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t === "google") return "google";
  if (t === "email_otp" || t === "email") return "email";
  if (t === "phone" || t === "phone_otp") return "phone";
  if (t === "wallet" || t === "siwe") return "wallet";
  return null;
}

export const generatePayload = thirdwebAuth.generatePayload;

export async function login(payload: VerifyLoginPayloadParams) {
  const verified = await thirdwebAuth.verifyPayload(payload);

  if (!verified.valid) {
    throw new Error("Invalid login payload");
  }

  const jwt = await thirdwebAuth.generateJWT({
    payload: verified.payload,
  });

  cookies().set("jwt", jwt, {
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function isLoggedIn() {
  const jwtCookie = cookies().get("jwt");

  if (!jwtCookie?.value) {
    return false;
  }

  const result = await thirdwebAuth.verifyJWT({ jwt: jwtCookie.value });
  return result.valid;
}

/**
 * Returns the current session user from the JWT and thirdweb (email, phone, etc.).
 * Use this after login to get data to store in your database.
 * Requires THIRDWEB_SECRET_KEY for in-app wallet details; otherwise only address is returned.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jwtCookie = cookies().get("jwt");
  if (!jwtCookie?.value) return null;

  const result = await thirdwebAuth.verifyJWT({ jwt: jwtCookie.value });
  if (!result.valid || !("parsedJWT" in result)) return null;

  // Keep JWT `sub` as canonical session address. This is the address that authenticated
  // the session and must stay consistent with backend auth token signing.
  const address = String(result.parsedJWT.sub || "").trim().toLowerCase();
  if (!address) return null;

  const base: SessionUser = {
    address,
    email: null,
    phone: null,
    userId: null,
    authMethod: "wallet",
    createdAt: null,
  };

  if (!thirdwebServerClient) return base;

  try {
    let user = await getUser({
      client: thirdwebServerClient,
      walletAddress: address,
    });
    if (!user) {
      user = await getUser({
        client: thirdwebServerClient,
        externalWalletAddress: address,
      });
    }

    if (!user) return base;

    const firstProfileType = user.profiles[0]?.type;
    const authMethod = authMethodFromProfileType(
      typeof firstProfileType === "string" ? firstProfileType : undefined
    );

    const sessionUser: SessionUser = {
      address,
      email: user.email ?? null,
      phone: user.phone ?? null,
      userId: user.userId ?? null,
      authMethod: authMethod ?? base.authMethod,
      createdAt: user.createdAt ?? null,
    };

    // Log in development so you can verify THIRDWEB_SECRET_KEY and user data.
    if (process.env.NODE_ENV !== "production") {
      // This logs to your Next.js server console (npm run dev).
      // Remove or adjust once you've confirmed things are working.
      console.log("[thirdweb] SessionUser", sessionUser);
    }

    return sessionUser;
  } catch {
    return base;
  }
}

export async function logout() {
  cookies().delete("jwt");
}
