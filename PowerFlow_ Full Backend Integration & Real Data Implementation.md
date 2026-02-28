# PowerFlow: Full Backend Integration & Real Data Implementation
This plan covers 4 major work streams: (1) M-Pesa integration hardening, (2) wallet-to-meter cloud token consumption, (3) real consumption tracking, (4) notifications system — plus removing all mock data and ensuring PIN/biometric auth on every session.
## Current State
* **M-Pesa**: `mpesa-payment` edge function is already fully implemented with Buy Goods model (Till 4159923), STK Push, callback handler, and wallet credit logic. `daraja-stk-query` handles STK query fallback. The `Recharge.tsx` page already uses real API calls with STK polling. This flow is **production-ready**.
* **Meter connection**: `meter-connect` edge function handles connect/disconnect/history via `meter_connections` table. `Meters.tsx` page uses real API calls. This flow is **working**.
* **P2P transfers**: `p2p-transfer` edge function handles send/daily_usage/history with daily limits and optimistic locking. `Transfer.tsx` page uses real API calls. This flow is **working**.
* **Home page**: Has hardcoded mock data for insights ("50.4 kWh", "6 PM", "12%"), recent activity (static array), daily average (7.2), and references Tuya-era meter fields (`tuya_device_id`, `sms_fallback`).
* **Analytics page**: All chart data is hardcoded (`dailyData`, `weeklyData`, `hourlyData`, monthly stats).
* **Notifications page**: Entirely hardcoded array of fake notifications.
* **Biometric auth**: `AppLockScreen` has a placeholder biometric handler that just calls `onUnlock()` without real WebAuthn flow. The `AuthGuard` shows `AppLockScreen` only if `!unlocked` in sessionStorage — this already blocks every session until PIN is entered. Biometric toggle in Profile writes to localStorage but isn't wired to WebAuthn.
* **tuya-meter edge function**: Still exists with Tuya IoT API integration. Per requirements, Tuya is no longer used for meter control — physical meters use `meter-connect` instead. But users may still visualize Tuya smart devices. We should leave `tuya-meter` for optional Tuya device visualization but it is not part of the core meter flow.
## 1. Wallet-to-Meter Cloud Token Consumption
The core new feature: when a user is connected to a meter, their wallet balance is automatically consumed over time (cloud tokens). The meter's consumption rate drives the deduction.
### 1a. New Edge Function: `consume-energy`
Create `supabase/functions/consume-energy/index.ts`:
* Called periodically (by a Supabase pg_cron job or external cron hitting the endpoint)
* For every active `meter_connections` row:
    * Look up the meter's `consumption_rate_per_hour`
    * Calculate kWh consumed since last log (or last check)
    * Deduct from user's `wallets.balance_kwh`
    * Insert a `consumption_logs` row
    * If wallet balance hits 0, the meter effectively stops (no more tokens). Optionally: create a notification.
* Uses service role key (no user auth — cron job)
* Guard against over-deduction: if wallet < consumption chunk, deduct only what's available
### 1b. New Migration: `consume_energy_cron`
Create a migration that sets up:
* A `pg_cron` job that calls a DB function `process_energy_consumption()` every 5 minutes
* The DB function loops through active connections and deducts proportional kWh
* Alternative: the DB function can be simpler (just mark connections needing processing) and the edge function does the heavy lifting
We'll use the **DB function approach** for atomicity — a single `process_energy_consumption()` PL/pgSQL function that:
1. Loops active connections
2. Calculates elapsed time since last `consumption_logs` entry (or `connected_at`)
3. Deducts `rate * elapsed_hours` from wallet
4. Inserts consumption log
5. If balance reaches 0, sets `meter.status = 'depleted'` or inserts notification
### 1c. API: Manual "Top Up Meter" (wallet → meter transfer)
The existing `tuya-meter?action=transfer_to_meter` is the old Tuya approach. In the new model, the wallet **automatically** feeds the connected meter. We don't need an explicit transfer action since consumption is cloud-driven.
However, we should add an endpoint on `meter-connect` for checking current consumption stats: `?action=consumption_stats` — returns total consumed for the active connection, rate, estimated time remaining.
### 1d. Frontend: Home page real meter data
Update `Home.tsx`:
* Remove `Meter` interface with Tuya fields (`tuya_device_id`, `sms_fallback`, etc.)
* Use `meterApi.getActiveConnection()` to fetch the active connection
* Display wallet balance and consumption rate from real data
* Calculate "days left" from `wallet_balance / (consumption_rate * 24)` instead of hardcoded 7.2
* Remove hardcoded recent activity — query `transactions` table for last 3-5 entries
* Remove hardcoded insights — compute from `consumption_logs` or show "Connect a meter" placeholder
## 2. Real Consumption Tracking (Analytics)
Replace all mock chart data in `Analytics.tsx` with real queries.
### 2a. New Edge Function: `consumption-stats`
Create `supabase/functions/consumption-stats/index.ts`:
* Actions:
    * `daily` — last 7 days of consumption from `consumption_logs`, grouped by day
    * `weekly` — last 4 weeks, grouped by week
    * `monthly` — last 2-3 months, grouped by month
    * `hourly` — today's consumption grouped by hour
    * `summary` — total this month, comparison vs last month, daily average
* All queries filter by `user_id` from auth token
### 2b. Update `Analytics.tsx`
* Replace static `dailyData`, `weeklyData`, `hourlyData` with data from `consumption-stats`
* Fetch summary stats from the API on mount
* Add loading states for each chart section
* Handle empty state (no data yet)
### 2c. Update Home page insights
* Fetch weekly total, peak hour, and savings % from `consumption-stats?action=summary`
* Replace hardcoded StatChip values
## 3. Notifications System
Replace the hardcoded notifications with a real database-backed system.
### 3a. New Migration: `create_notifications`
Create `supabase/migrations/YYYYMMDD_create_notifications.sql`:
```SQL
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'transfer', 'meter', 'low_balance', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '🔔',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
```
### 3b. Helper function: `create_notification()`
A reusable PL/pgSQL or edge function helper that creates a notification. Called by:
* `mpesa-payment` callback → "Payment Confirmed: +X kWh added"
* `p2p-transfer` send action → "Transfer Sent" / "Transfer Received"
* `process_energy_consumption()` when balance hits low threshold → "Low Balance Alert"
* `meter-connect` connect/disconnect → "Meter Connected" / "Meter Disconnected"
We'll add a DB function `insert_notification(user_uuid, type, title, body, icon)` that other functions can call.
### 3c. Update edge functions to create notifications
Add notification inserts to:
* `mpesa-payment` callback handler (on success/failure)
* `p2p-transfer` send action (for both sender and recipient)
* `meter-connect` connect/disconnect actions
* `process_energy_consumption` when wallet < 5 kWh (low balance alert, max once per day)
### 3d. Update `Notifications.tsx`
* Replace hardcoded array with real data from `supabase.from('notifications').select('*').order('created_at', {ascending: false}).limit(50)`
* Keep the UI structure (type colors, read/unread, mark all read)
* Add real "mark all read" using `supabase.from('notifications').update({read: true}).eq('user_id', userId).eq('read', false)`
* Add empty state when no notifications exist
* Show notification count badge on Home header from real unread count
## 4. Remove All Mock/Hardcoded Data
### 4a. `Home.tsx`
* Remove Tuya `Meter` interface, replace with active connection from `meterApi`
* Replace hardcoded `dailyAvg = 7.2` with computed value from consumption data
* Replace hardcoded insights ("50.4 kWh", "6 PM", "12%") with real data or "No data" placeholders
* Replace hardcoded recent activity array with real transaction query
* Fix "Connect Your First Meter" text (remove "Tuya" mention, just say "4G smart meter")
* Show active connection info instead of `meters[0]` with Tuya fields
* Fix notification badge to show real unread count
### 4b. `Analytics.tsx`
* Remove all hardcoded chart data arrays
* Fetch from `consumption-stats` edge function
* Show loading/empty states
### 4c. `Notifications.tsx`
* Remove hardcoded `allNotifications` array
* Fetch from notifications table
### 4d. `Recharge.tsx`
* Remove hardcoded `dailyAvg = 7.2` (line 37) — compute from consumption or omit
## 5. Biometric Auth (WebAuthn)
The existing `AppLockScreen` already blocks every session until PIN is entered. The biometric button exists but is a no-op. We'll implement a real WebAuthn registration and authentication flow.
### 5a. WebAuthn Registration (Profile → Enable Biometric)
When user toggles biometric ON in Profile:
1. Call `navigator.credentials.create()` with a WebAuthn PublicKeyCredentialCreationOptions
2. Store the credential ID in the user's profile (`profiles.webauthn_credential_id`)
3. The registration is tied to the device/browser
### 5b. WebAuthn Authentication (AppLockScreen)
When `AppLockScreen` renders and biometric is enabled:
1. Call `navigator.credentials.get()` with the stored credential ID
2. On success, call `onUnlock()`
3. On failure/cancel, fall back to PIN entry
### 5c. Migration: Add webauthn column
```SQL
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;
```
Note: Full WebAuthn requires a server-side challenge verification for production security. For a PWA without a custom server (using Supabase), we'll do a simplified client-side-only WebAuthn flow that verifies the user is present on the device. This is suitable for a lock screen (not for authentication against a server).
## Implementation Order
1. **Notifications migration + DB helper** — needed by most other changes
2. **Energy consumption DB function + cron** — core new feature
3. **Consumption stats edge function** — feeds analytics and home
4. **Update edge functions to emit notifications** — M-Pesa, P2P, meter-connect, consumption
5. **Update Home.tsx** — real data, remove mocks, active connection
6. **Update Analytics.tsx** — real consumption data
7. **Update Notifications.tsx** — real notifications
8. **Update Recharge.tsx** — remove hardcoded daily avg
9. **WebAuthn biometric** — registration and authentication
10. **Cleanup** — remove Tuya references from Home meter interface, update AGENTS.md
