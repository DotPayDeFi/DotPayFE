# DotPay Frontend (DotPayFE)

Next.js (App Router) consumer wallet UI for DotPay (KES-first).

Core user journeys:

- `Send` – on-chain transfer or off-chain payout to an M-Pesa number (B2C)
- `Pay` – pay merchants via M-Pesa PayBill or Till (B2B)
- `Add Funds` – initiate M-Pesa STK Push top up (Lipa na M-Pesa Online)

## Requirements

- Node.js >= 18
- A running backend (`DotPayBE`) locally or hosted
- For local M-Pesa testing: a public HTTPS callback URL for the backend (see backend tunnel script)

## Setup

```bash
cd /Users/Shared/odero/DotPay/DotPayFE
npm install
cp .env.example .env.local
```

Fill values in `.env.local` (never commit it).

## Run Locally (Full Stack)

1. Start backend + tunnel (required for callbacks):

```bash
cd /Users/Shared/odero/DotPay/DotPayBE
# Option A (recommended): keep backend running in your terminal
RESTART_BACKEND=false ./scripts/start-local-tunnel.sh
npm run dev

# Option B: let the tunnel script start/restart the backend for you (runs `npm start` in a screen session)
# ./scripts/start-local-tunnel.sh
```

2. Point frontend to backend and run:

```bash
cd /Users/Shared/odero/DotPay/DotPayFE
# ensure NEXT_PUBLIC_DOTPAY_API_URL=http://localhost:4000 in .env.local
npm run dev
```

App: `http://localhost:3000`

## How M-Pesa + Crypto Works (Send/Pay)

For `offramp`, `paybill`, and `buygoods` the app uses a **user-push funding model**:

1. Frontend requests a quote from backend.
2. User confirms with app PIN + wallet signature.
3. Frontend transfers the quoted USDC amount to the treasury wallet (on-chain).
4. Backend verifies the on-chain transfer (USDC `Transfer` log: user -> treasury).
5. Backend submits the Daraja B2C/B2B request.
6. Backend receives Daraja callbacks and marks the transaction `succeeded` or `failed`.
7. If M-Pesa fails after funding and refunds are enabled, backend refunds the funded USDC.

Relevant code:

- Flow UI: `DotPayFE/components/mpesa/MpesaSendModePage.tsx`
- Client: `DotPayFE/lib/mpesa-client.ts`
- Auth message format: `DotPayFE/lib/mpesa-signing.ts`

## Backend Auth Token

User-initiated M-Pesa endpoints are protected by a short-lived bearer token.
Frontend mints the token from the current logged-in session via:

- `GET /api/auth/backend-token` (`DotPayFE/app/api/auth/backend-token/route.ts`)

Token signing uses `DOTPAY_BACKEND_JWT_SECRET` (must match backend).

## Sandbox Test Values

Safaricom Daraja sandbox commonly uses:

- Test phone: `254708374149`
- STK Push BusinessShortCode: `174379`
- PayBill receiver: `600000`
- BuyGoods till: `300584`

Network:

- `NEXT_PUBLIC_DOTPAY_NETWORK=sepolia` (Arbitrum Sepolia)

## Troubleshooting

- Transaction stuck in `mpesa_processing`
  - Your backend callback URL is not reachable by Safaricom. Restart the tunnel and restart backend.
- “M-Pesa Receipt” shows `-` for PayBill/BuyGoods
  - The B2B callback payload often does not include a receipt/transaction-id field. Use the transaction timeline + conversation IDs for tracking.
- 404s for `/_next/static/*` after refresh
  - The app is a PWA. Unregister the service worker and hard refresh, then restart `npm run dev`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm start
```

## Deploy (Vercel)

1. Import `DotPayFE` as a Vercel project.
2. Set env vars from `DotPayFE/.env.example`.
3. Ensure `NEXT_PUBLIC_DOTPAY_API_URL` points to your hosted backend.

## Security Notes

- Do not commit secrets. Keep them in Vercel env vars and local `.env.local` (gitignored).
- Never put treasury private keys in frontend env vars. Treasury keys belong in the backend only.
