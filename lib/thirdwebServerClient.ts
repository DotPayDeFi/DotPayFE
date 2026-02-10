import { createThirdwebClient } from "thirdweb";

/**
 * Server-only thirdweb client with secret key.
 * Used to fetch user details (email, phone, etc.) from thirdweb after sign-in.
 * Requires THIRDWEB_SECRET_KEY in env (from thirdweb dashboard → Project → API Keys).
 */
function getServerThirdwebClient() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  if (!secretKey) return null;

  return createThirdwebClient({
    secretKey,
  });
}

export const thirdwebServerClient = getServerThirdwebClient();
