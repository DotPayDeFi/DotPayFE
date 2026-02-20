import "server-only";
import crypto from "crypto";

export type BackendTokenPayload = {
  sub: string;
  address: string;
  scope: "mpesa";
  iat: number;
  exp: number;
};

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

export function signBackendToken(address: string, ttlSeconds: number = 300): string {
  const secret = (process.env.DOTPAY_BACKEND_JWT_SECRET || "").trim();
  if (!secret) {
    throw new Error("DOTPAY_BACKEND_JWT_SECRET is not configured.");
  }

  const normalizedAddress = String(address || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalizedAddress)) {
    throw new Error("Invalid wallet address for backend token.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: BackendTokenPayload = {
    sub: normalizedAddress,
    address: normalizedAddress,
    scope: "mpesa",
    iat: now,
    exp: now + Math.max(60, ttlSeconds),
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}
