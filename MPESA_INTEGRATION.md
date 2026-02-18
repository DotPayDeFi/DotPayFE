# M-Pesa Integration (DotPayFE)

This frontend now calls the backend M-Pesa routes (borrowed from `backendMirror`) through `lib/mpesa.ts`.

## Configuration

Set your backend base URL:

```bash
NEXT_PUBLIC_DOTPAY_API_URL=http://localhost:4000
```

Auth token is read from `localStorage.dotpay_token` and sent as `Authorization: Bearer <token>`.

## C2B (Customer to Business)

Used when a user initiates payment from their phone to purchase crypto or pay merchant targets.

- `mpesaAPI.deposit` -> `POST /api/mpesa/deposit`
- `mpesaAPI.buyCrypto` -> `POST /api/mpesa/buy-crypto`
- `mpesaAPI.payBill` -> `POST /api/mpesa/pay/paybill`
- `mpesaAPI.payTill` -> `POST /api/mpesa/pay/till`

Notes:
- Phone is normalized from `phone`, `phoneNumber`, or stored user profile (`dotpay_user.phoneNumber`).
- Amounts are validated client-side as positive numbers before request dispatch.

## B2C (Business to Customer)

Used when crypto is converted and funds are sent to an M-Pesa phone number.

- `mpesaAPI.cryptoToMpesa` -> `POST /api/mpesa/crypto-to-mpesa`
- `mpesaAPI.withdraw` ->  
  - `POST /api/mpesa/withdraw` (when `businessId` is provided), or  
  - `POST /api/mpesa/crypto-to-mpesa` (default path)

Related backend callbacks (handled by backend, not frontend):
- `POST /api/mpesa/b2c-callback`
- `POST /api/mpesa/queue-timeout`

## B2B (Business to Business)

Used for paybill/till settlement via crypto spending flow.

- `mpesaAPI.payWithCrypto` -> `POST /api/mpesa/pay-with-crypto`

Related backend callback:
- `POST /api/mpesa/b2b-callback`

## Shared Utilities Added in `lib/mpesa.ts`

- Central request helper with consistent auth + JSON handling.
- Axios-like thrown errors (`error.response.status`, `error.response.data`) for compatibility with existing form error handling.
- Response normalization so both standard backend responses and plain JSON payloads resolve to:

```ts
{ success: boolean; message: string; data: any; timestamp?: string }
```

## Existing Hook Compatibility

`hooks/useMpesa.ts` remains compatible with no contract changes required.  
Implemented methods now include:

- `deposit`
- `buyCrypto`
- `withdraw`
- `cryptoToMpesa`
- `payBill`
- `payTill`
- `payWithCrypto`
- `submitReceipt`
- `getTransactionStatus`
- `getExchangeRate`

