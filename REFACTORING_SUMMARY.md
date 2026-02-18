# Frontend Data Sources Summary

This frontend started as a UI-first refactor where many APIs were intentionally stubbed via
`DotPayFE/lib/mock-data.ts` to keep UX work unblocked.

As of the current iteration, **some critical paths are real** (wired to DotPayBE and chain),
while other areas still use mock data.

## Real Integrations (Implemented)

- M-Pesa flows (quotes, initiate, status polling) via DotPayBE:
  - Client: `DotPayFE/lib/mpesa-client.ts`
  - Hooks: `DotPayFE/hooks/useMpesaFlows.ts`
  - UI: `DotPayFE/components/mpesa/*`, routes under `DotPayFE/app/send` and `DotPayFE/app/receive`
- Backend user identity sync (DotPay ID + username) via DotPayBE:
  - `DotPayFE/lib/backendUser.ts`
- Backend bearer token minting for authenticated M-Pesa calls:
  - `DotPayFE/app/api/auth/backend-token/route.ts`
- On-chain activity (USDC transfers) via Arbiscan:
  - `DotPayFE/hooks/useOnchainActivity.ts`

## Still Mocked / Placeholder (Not Yet Fully Wired)

Many contexts and legacy helper libraries still call into `DotPayFE/lib/mock-data.ts`, including:

- `DotPayFE/context/WalletContext.tsx`
- `DotPayFE/context/BalanceContext.tsx`
- `DotPayFE/context/BusinessContext.tsx`
- A number of legacy libs under `DotPayFE/lib/*` (auth, wallet, crypto, stellar, earn, etc.)

## If You Are Extending Backend Coverage

Start by replacing mock usage in the contexts above with real API clients, and keep the
typed/verified M-Pesa + settlement flows unchanged.
