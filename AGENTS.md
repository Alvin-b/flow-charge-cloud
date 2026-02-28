# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

PowerFlow (Flow Charge Cloud) is a prepaid electricity resale PWA. PowerFlow buys electricity from KPLC (~KES 20/kWh) and resells to clients at KES 24/kWh. Users purchase kWh via M-Pesa mobile money into a cloud wallet, then transfer energy to physical 4G smart meters. On each client payment, a configurable commission (default 10%) is retained and the remainder is automatically forwarded to KPLC via M-Pesa B2B (paybill 888880). If the KPLC-owed amount is below the minimum (KES 25), it pools until the threshold is met.

## Build and Development Commands

```
npm install          # Install dependencies
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
```

Run a single test file:
```
npx vitest run src/path/to/file.test.ts
```

### Supabase Edge Functions

```
supabase functions deploy mpesa-payment
supabase functions deploy daraja-stk-query
supabase functions deploy meter-connect
supabase functions deploy p2p-transfer
supabase functions deploy tuya-meter
supabase functions deploy consumption-stats
supabase functions deploy kplc-b2b
supabase functions logs <function-name> --tail
supabase db push                              # Apply migrations
```

Edge functions are Deno/TypeScript (not Node). They use `https://deno.land/std` and `https://esm.sh/` imports. Located in `supabase/functions/`.

## Architecture

### Frontend Stack
- React 18 + TypeScript + Vite (SWC plugin)
- Tailwind CSS with shadcn/ui (Radix primitives) — components in `src/components/ui/`
- React Router v6 (client-side routing in `src/App.tsx`)
- TanStack React Query for server state
- Recharts for analytics charts
- Capacitor configured for Android native builds
- PWA via `vite-plugin-pwa` with service worker

### Path Alias
`@/` maps to `./src/` (configured in `tsconfig.json` and `vite.config.ts`).

### Backend
Supabase provides auth, Postgres database, and edge functions. No custom Node server.

**Supabase client**: `src/integrations/supabase/client.ts` — auto-generated, do not edit. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`.

**Database types**: `src/integrations/supabase/types.ts` — auto-generated TypeScript types for all tables.

### Key Database Tables
- `profiles` — user info (name, phone, pin_hash). Linked to Supabase Auth users via `user_id`.
- `wallets` — energy wallet per user (`balance_kwh`, `max_kwh`).
- `meters` — physical 4G smart meters (`meter_code`, `hardware_serial`, `balance_kwh`, `status`). Status is one of: `available`, `connected`, `offline`, `maintenance`.
- `meter_connections` — tracks active user-to-meter connections. One active connection per user at a time. A DB trigger sets meter status to `connected` on insert; the `disconnect_from_meter()` RPC resets it to `available`.
- `transactions` — all financial records (`type`: `recharge` | `transfer_out` | `transfer_in` | `meter_transfer`). M-Pesa fields: `mpesa_checkout_request_id`, `mpesa_receipt_number`.
- `meter_transfers` — detailed wallet-to-meter transfer audit trail with balance snapshots.
- `consumption_logs` — historical energy consumption per meter/connection.
- `notifications` — user notifications (payment, transfer, meter, low_balance, system).
- `system_settings` — admin-configurable key-value store (commission_percent, kplc_paybill, kplc_account_number, kplc_min_payment, resale_rate_kes_per_kwh, b2b_initiator_name).
- `payment_splits` — tracks commission/KPLC split for each recharge. Fields: `original_amount_kes`, `commission_percent`, `commission_amount_kes`, `kplc_amount_kes`, `forwarded` (bool), `kplc_payment_id`.
- `kplc_payments` — tracks each M-Pesa B2B payment sent to KPLC (amount, paybill, account, status, M-Pesa conversation IDs).
- `admin_meters` — admin portal meter registration records.

All tables have Row-Level Security (RLS) policies. Migrations are in `supabase/migrations/`.

### Authentication Flow
1. Phone-based auth via Supabase Auth (register/login with OTP).
2. After login, users must set a 4-digit PIN (`/auth/pin`).
3. `AuthGuard` (`src/components/AuthGuard.tsx`) wraps protected routes — redirects to `/auth/login` if unauthenticated, or `/auth/pin` if PIN not set.
4. On each session, authenticated users must unlock with their PIN via `AppLockScreen` before accessing protected pages (unlock state stored in `sessionStorage`).
5. Auth context provided by `AuthProvider` in `src/hooks/useAuth.tsx`.

### API Layer (`src/lib/api.ts`)
Client-side API wrappers that call Supabase edge functions with Bearer auth tokens. All edge functions use `?action=<name>` query parameter for routing.

- `mpesaApi` — STK push initiation (`mpesa-payment?action=initiate_stk_push`), DB status check (`mpesa-payment?action=check_status`), and direct Safaricom STK query (`daraja-stk-query`).
- `meterApi` — connect/disconnect meters, get active connection, connection history. Calls the `meter-connect` edge function.
- `transferApi` — P2P energy transfers between users (`p2p-transfer?action=send`), daily usage limits, transfer history.
- `transactionApi` — transaction history and summary (direct Supabase client queries, not edge functions).

### Edge Functions
- `mpesa-payment` — M-Pesa Daraja API integration. Handles STK push, callbacks from Safaricom, and transaction status. The callback action (`?action=callback`) uses a service role client (no user auth) since it's called by Safaricom servers.
- `daraja-stk-query` — Queries Safaricom directly for STK push result status. Also updates transaction/wallet in DB if callback was missed. No `?action=` routing; single POST endpoint.
- `meter-connect` — Physical meter connection management. Actions: `connect` (by meter_code), `disconnect` (by connection_id via DB RPC), `active` (get current connection), `history`.
- `p2p-transfer` — User-to-user energy transfers with daily limit enforcement (50 kWh/day, min 0.5 kWh). Uses optimistic locking on wallet balance. Actions: `send`, `daily_usage`, `history`. Creates paired `transfer_out`/`transfer_in` transaction records.
- `tuya-meter` — Tuya IoT API integration with HMAC-SHA256 signing. Handles device info, meter linking/unlinking, sync, and wallet-to-meter transfers.
- `consumption-stats` — Returns aggregated consumption data from `consumption_logs`. Actions: `daily` (7 days), `weekly` (4 weeks), `monthly` (3 months), `hourly` (today), `summary` (totals, averages, peak hour).
- `kplc-b2b` — KPLC B2B payment pool management. Uses service role key. Actions:
  - `process_pool` — Checks unforwarded pool balance; if ≥ threshold, initiates M-Pesa B2B to KPLC paybill 888880 with `BusinessPayBill` command. Called by cron every 10 min and inline after each successful recharge.
  - `b2b_callback` — Safaricom B2B result callback. On success marks payment completed; on failure returns splits to pool for retry.
  - `b2b_timeout` — Safaricom B2B timeout callback.
  - `pool_status` — Admin endpoint: pool balance, commission totals, recent KPLC payments, settings.
  - `update_settings` — Admin endpoint: update system_settings values.

### Page Structure
All pages are in `src/pages/`. Each page manages its own data fetching (typically via `supabase` client directly or the `api.ts` wrappers). Pages use `BottomNav` for mobile navigation. Auth pages are in `src/pages/auth/`.

### UI Conventions
- Dark theme by default (`ThemeProvider` with `next-themes`). Brand colors: navy background, cyan accent.
- Glassmorphic card style via `glass-card` CSS class. Custom gradients: `gradient-navy`, `gradient-cyan`, `gradient-wallet`.
- Custom animations defined in `tailwind.config.ts`: `fade-in-up`, `scale-in`, `slide-up`, `pulse-ring`, `float`, `shimmer`.
- Toast notifications via Sonner (`sonner` package).
- Icons from `lucide-react`.

### TypeScript Configuration
Strict mode is OFF. `noImplicitAny`, `strictNullChecks`, and `noUnusedLocals` are all disabled. The project tolerates loose typing.

### KPLC Payment Pool Flow
1. Client pays KES X via M-Pesa STK Push (existing flow, no change).
2. On successful callback (`mpesa-payment?action=callback`): wallet credited with X/24 kWh, then a `payment_splits` row is created with commission (X × 10%) and KPLC amount (X × 90%).
3. Pool balance = sum of `payment_splits` where `forwarded = false`.
4. If pool ≥ KES 25 threshold: `kplc-b2b?action=process_pool` is called (fire-and-forget from callback + cron every 10 min).
5. B2B sends to KPLC paybill 888880 with the KPLC account number from `system_settings`.
6. On B2B success callback: splits marked `forwarded = true`. On failure: splits return to pool for retry.
7. `daraja-stk-query` also creates splits in its fallback wallet-credit path (guards against duplicate splits).

### Environment Variables (B2B)
- `MPESA_B2B_INITIATOR_NAME` — M-Pesa Org Portal initiator username
- `MPESA_B2B_SECURITY_CREDENTIAL` — Initiator password encrypted with Safaricom production certificate
- `MPESA_B2B_RESULT_URL` — Callback URL for B2B results (points to `kplc-b2b?action=b2b_callback`)
- `MPESA_B2B_TIMEOUT_URL` — Timeout callback URL (points to `kplc-b2b?action=b2b_timeout`)

### Testing
Vitest with jsdom environment and `@testing-library/react`. Setup file at `src/test/setup.ts`. Test files go in `src/**/*.{test,spec}.{ts,tsx}`. Currently minimal test coverage.
