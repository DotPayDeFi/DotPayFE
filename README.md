# DotPayFE

Consumer payments UI for DotPay (KES-first), built with Next.js App Router.

## Local Development

```bash
npm install
cp .env.example .env
# fill the env vars
npm run dev
```

App runs at `http://localhost:3000`.

## Backend

The backend is a separate repo (not inside this project). Set:

- `NEXT_PUBLIC_DOTPAY_API_URL` to your backend URL (local or production)
- `DOTPAY_INTERNAL_API_KEY` must match the backend’s `DOTPAY_INTERNAL_API_KEY`

If the backend URL is not configured, DotPay ID / username / notifications features degrade gracefully.

## Deploy (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. In Vercel Project Settings, set Environment Variables (from `.env.example`):
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
   - `NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN` (set to your Vercel/custom domain, no protocol)
   - `AUTH_PRIVATE_KEY`
   - `THIRDWEB_SECRET_KEY` (recommended)
   - `NEXT_PUBLIC_DOTPAY_API_URL`
   - `DOTPAY_INTERNAL_API_KEY`
   - `ARBISCAN_API_KEY` (required for on-chain activity + notifications verification)
   - `NEXT_PUBLIC_DOTPAY_NETWORK` (`mainnet` for production, `sepolia` for testing)
   - `NEXT_PUBLIC_DOTPAY_SPONSORED_GAS` (`true` to enable ERC-4337 sponsored gas, `false` to disable)

Vercel will run `npm run build` and `npm start` automatically.

## Security

Do not commit secrets. Keep them in Vercel env vars (and local `.env`, which is gitignored).
