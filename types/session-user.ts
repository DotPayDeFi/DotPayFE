/**
 * User data we get from thirdweb after sign-in/sign-up.
 * Use this shape when storing users in your database (e.g. after first login).
 *
 * - In-app wallet (Google, email, SMS): thirdweb returns email, phone, userId, profiles.
 * - External wallet (SIWE): we only get address from the JWT; getUser may return null.
 */
export type SessionUser = {
  /** Wallet address (always present when logged in). */
  address: string;
  /** Email if user signed in with email or linked Google. */
  email: string | null;
  /** Phone if user signed in with SMS. */
  phone: string | null;
  /** thirdweb user id (in-app wallets). */
  userId: string | null;
  /** Auth method: "google" | "email" | "phone" | "wallet" (external). */
  authMethod: "google" | "email" | "phone" | "wallet" | null;
  /** When the thirdweb user was created (in-app). */
  createdAt: string | null;
};
