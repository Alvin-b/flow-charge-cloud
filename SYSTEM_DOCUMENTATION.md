# PowerFlow (Flow Charge Cloud) — Complete System Documentation

> **Version:** 1.0 | **Last Updated:** March 8, 2026  
> **Platform:** Progressive Web App (React/Vite + Supabase Backend)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [User Journey & Flows](#3-user-journey--flows)
4. [Authentication System](#4-authentication-system)
5. [Payment Integration (M-Pesa)](#5-payment-integration-m-pesa)
6. [Cloud Wallet System](#6-cloud-wallet-system)
7. [Meter Management](#7-meter-management)
8. [MQTT / COMPERE Protocol Integration](#8-mqtt--compere-protocol-integration)
9. [Real-Time Sync Architecture (Planned)](#9-real-time-sync-architecture-planned)
10. [KPLC B2B Payment Pool](#10-kplc-b2b-payment-pool)
11. [P2P Energy Transfers](#11-p2p-energy-transfers)
12. [IoT Hub](#12-iot-hub)
13. [Admin Dashboard](#13-admin-dashboard)
14. [Database Schema](#14-database-schema)
15. [Edge Functions Reference](#15-edge-functions-reference)
16. [Security Architecture](#16-security-architecture)
17. [Frontend Architecture](#17-frontend-architecture)
18. [Notification System](#18-notification-system)
19. [Deployment & Infrastructure](#19-deployment--infrastructure)
20. [Rate Limiting](#20-rate-limiting)
21. [Error Handling](#21-error-handling)

---

## 1. System Overview

### What is PowerFlow?

PowerFlow is a **prepaid electricity resale platform** built as an installable PWA. It enables a property manager (the operator) to:

1. **Buy electricity** from KPLC (Kenya Power) at ~KES 20/kWh
2. **Resell** to tenants/clients at **KES 24/kWh** (configurable markup)
3. **Automate** KPLC payments via M-Pesa B2B
4. **Monitor** consumption via smart meters in real-time

### Business Model

```
┌──────────┐    KES 24/kWh    ┌──────────────┐    KES ~20/kWh    ┌──────┐
│  Tenant  │ ──── M-Pesa ───→ │  PowerFlow   │ ──── M-Pesa ───→  │ KPLC │
│  (User)  │ ←── kWh credit ─ │  (Operator)  │    B2B Paybill    │      │
└──────────┘                   └──────────────┘    (888880)        └──────┘
                                      │
                               10% Commission
                               retained by operator
```

### Key Value Proposition

- **For tenants:** No KPLC tokens needed. Recharge via M-Pesa, energy auto-loads to meter.
- **For operators:** Automated revenue split, real-time meter monitoring, zero manual intervention.
- **For the system:** Cloud-based wallet prevents token losses, enables P2P transfers.

---

## 2. Architecture Diagram

```
                          ┌─────────────────────────────────────┐
                          │           FRONTEND (PWA)            │
                          │  React + Vite + Tailwind + shadcn   │
                          │  Service Worker for offline/cache   │
                          └──────────────┬──────────────────────┘
                                         │
                              HTTPS / Supabase SDK
                                         │
                          ┌──────────────▼──────────────────────┐
                          │         SUPABASE BACKEND            │
                          │                                     │
                          │  ┌────────────┐  ┌───────────────┐  │
                          │  │  Auth      │  │  PostgreSQL   │  │
                          │  │  (Email +  │  │  Database     │  │
                          │  │   OTP)     │  │  + RLS        │  │
                          │  └────────────┘  └───────────────┘  │
                          │                                     │
                          │  ┌────────────────────────────────┐ │
                          │  │     Edge Functions (Deno)      │ │
                          │  │                                │ │
                          │  │  • mpesa-payment (STK Push)    │ │
                          │  │  • daraja-stk-query            │ │
                          │  │  • meter-connect               │ │
                          │  │  • mqtt-meter (commands)       │ │
                          │  │  • mqtt-webhook (ingest)       │ │
                          │  │  • p2p-transfer                │ │
                          │  │  • kplc-b2b                    │ │
                          │  │  • consumption-stats           │ │
                          │  │  • tuya-meter                  │ │
                          │  │  • admin-api                   │ │
                          │  │  • ai-energy-insights          │ │
                          │  └────────────────────────────────┘ │
                          └──────────┬───────────┬──────────────┘
                                     │           │
                        ┌────────────▼──┐   ┌────▼──────────────┐
                        │   Safaricom   │   │  EMQX MQTT Broker │
                        │   Daraja API  │   │  207.126.167.78   │
                        │   (M-Pesa)    │   │  Port 1883 (MQTT) │
                        │               │   │  Port 8081 (HTTP) │
                        └───────────────┘   │  Port 18083 (Dash)│
                                            └────────┬──────────┘
                                                     │
                                              MQTT Protocol
                                           (COMPERE V1.9)
                                                     │
                                            ┌────────▼──────────┐
                                            │  DDS666 4G Smart  │
                                            │  Meters (Physical)│
                                            │  3-phase energy   │
                                            │  monitoring       │
                                            └───────────────────┘
```

---

## 3. User Journey & Flows

### 3.1 New User Onboarding

```
1. User opens PWA → Splash Screen (2.8s)
2. Onboarding carousel (first visit only)
3. Register: Full Name + Phone + Email + Password
   → upsert_profile RPC creates profile
   → Trigger creates wallet (0 kWh, 200 kWh max)
4. Verify email (mandatory confirmation)
5. Set 4-digit PIN (/auth/pin)
6. → Redirected to Home Dashboard
```

### 3.2 Returning User Login

```
1. Login with Email + Password
2. App Lock Screen appears (PIN entry)
   → verify_pin RPC validates server-side
   → sessionStorage stores unlock state (per-tab)
3. → Home Dashboard
```

### 3.3 Recharge Flow

```
1. User navigates to /recharge
2. Enters KES amount (min 10, max 150,000)
3. Confirms phone number
4. STK Push sent to phone → M-Pesa PIN prompt
5. UI polls for status (10s intervals, max 6 attempts)
   + Supabase Realtime listener (wallets table UPDATE)
6. On callback success:
   a. Wallet credited with amount/24 kWh
   b. Payment split created (10% commission + 90% KPLC pool)
   c. If pool ≥ KES 25 → B2B to KPLC triggered
   d. Notification sent
7. Hard timeout at 90 seconds → fallback STK query
```

### 3.4 Meter Connection Flow

```
1. User navigates to /meters
2. Scans QR code OR enters meter code manually
3. System checks:
   - Rate limit (3 attempts/minute)
   - No existing active connection
   - Meter exists and status = "available"
4. Creates meter_connection record
5. DB trigger sets meter status → "connected"
6. Notification sent
```

### 3.5 Meter Disconnection

```
1. User disconnects from /meters page
2. disconnect_from_meter RPC (atomic):
   a. Sets connection is_active = false
   b. Sets meter status = "available"
3. Notification sent
```

---

## 4. Authentication System

### Technology

- **Provider:** Supabase Auth (email/password)
- **Email confirmation:** Mandatory (auto-confirm disabled)
- **Session:** JWT tokens, managed by Supabase SDK

### PIN Security Layer

On top of standard auth, PowerFlow adds a **4-digit PIN** system:

| RPC Function | Purpose |
|---|---|
| `set_pin(p_pin_hash)` | Store hashed PIN in profiles table |
| `verify_pin(p_pin_hash)` | Compare hash server-side, return boolean |
| `has_pin()` | Check if PIN is set for current user |
| `reset_pin()` | Clear PIN hash (requires email OTP verification first) |

All PIN RPCs are `SECURITY DEFINER` with `SET search_path TO 'public'`.

### Auth Guard & App Lock

```
AuthGuard (src/components/AuthGuard.tsx)
├── Not logged in → redirect /auth/login
├── No PIN set → redirect /auth/pin
└── PIN set but not unlocked this session → AppLockScreen
    └── PIN verified → sessionStorage("powerflow-unlocked") = true
```

### Forgot PIN Recovery

```
1. User clicks "Forgot PIN" on lock screen
2. Email OTP sent via Supabase Auth
3. User enters OTP code
4. reset_pin() RPC clears PIN hash
5. Redirect to /auth/pin for new PIN setup
```

---

## 5. Payment Integration (M-Pesa)

### Configuration

| Parameter | Value |
|---|---|
| **Transaction Type** | CustomerBuyGoodsOnline (Till Number) |
| **Till Number** | 4159923 |
| **Shortcode** | From DARAJA_SHORTCODE secret |
| **API** | Safaricom Daraja (Production) |
| **Base URL** | https://api.safaricom.co.ke |
| **Rate** | KES 24 per kWh |

### Secrets Used

| Secret | Purpose |
|---|---|
| `DARAJA_CONSUMER_KEY` | OAuth2 client ID |
| `DARAJA_CONSUMER_SECRET` | OAuth2 client secret |
| `DARAJA_SHORTCODE` | M-Pesa business shortcode |
| `DARAJA_PASSKEY` | STK Push passkey |

### STK Push Flow (Edge Function: `mpesa-payment`)

```
Client                     Edge Function              Safaricom
  │                              │                         │
  │── POST initiate_stk_push ──→│                         │
  │                              │── OAuth token req ────→│
  │                              │←── access_token ───────│
  │                              │                         │
  │                              │── STK Push request ───→│
  │                              │←── CheckoutRequestID ──│
  │                              │                         │
  │←── {transaction_id} ────────│                         │
  │                              │                         │
  │     (User enters M-Pesa PIN on phone)                 │
  │                              │                         │
  │                              │←── Callback POST ──────│
  │                              │   (ResultCode=0 → OK)  │
  │                              │                         │
  │                              │── credit_wallet RPC     │
  │                              │── create payment_split  │
  │                              │── trigger B2B if pool≥25│
  │                              │── insert notification   │
  │                              │                         │
  │←── Realtime wallet update ──│                         │
```

### Fallback: `daraja-stk-query`

If the callback from Safaricom is missed (network issues), the client can query the STK Push result directly:

```
POST /functions/v1/daraja-stk-query
Body: { "checkout_request_id": "ws_CO_..." }

Returns: { status: "completed"|"pending"|"failed"|"cancelled"|"timeout" }
```

This function also credits the wallet if the payment was successful but the callback was missed, with duplicate-prevention guards.

---

## 6. Cloud Wallet System

### Design

Each user has exactly **one wallet** stored in the `wallets` table:

| Column | Type | Description |
|---|---|---|
| `user_id` | UUID | References auth.users |
| `balance_kwh` | numeric | Current energy balance |
| `max_kwh` | numeric | Maximum capacity (default 200) |

### Wallet Creation

Automatic via database trigger `create_wallet_for_new_user`:
- Fires on INSERT to `profiles` table
- Creates wallet with `balance_kwh=0`, `max_kwh=200`
- Uses `ON CONFLICT DO NOTHING` for idempotency

### Atomic Operations

| RPC | Purpose | Safety |
|---|---|---|
| `credit_wallet(p_user_id, p_amount_kwh)` | Add kWh | SECURITY DEFINER, atomic UPDATE |
| `debit_wallet(p_user_id, p_amount_kwh)` | Remove kWh | Checks balance ≥ amount before deducting |

Both RPCs return the new balance and raise exceptions on failure.

### Realtime Updates

The wallet table is subscribed to via Supabase Realtime on the home page:

```typescript
supabase.channel("home-wallet")
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets" }, (payload) => {
    setWallet({ balance_kwh: payload.new.balance_kwh, max_kwh: payload.new.max_kwh });
  })
  .subscribe();
```

---

## 7. Meter Management

### Meter Table Schema

| Column | Description |
|---|---|
| `id` | UUID primary key |
| `name` | Display name (default "My Meter") |
| `tuya_device_id` | Tuya IoT device identifier |
| `property_name` | Location/property label |
| `balance_kwh` | Meter-side energy balance |
| `max_kwh` | Maximum capacity |
| `status` | `available` / `connected` / `offline` / `maintenance` |
| `user_id` | Owner's auth user ID |
| `rate_kwh_hr` | Consumption rate per hour |
| `sms_fallback` | Whether SMS backup is enabled |

### Connection Lifecycle

```
                   User scans QR / enters code
                              │
                              ▼
                    ┌────────────────────┐
                    │  Meter Available?  │
                    └────────┬───────────┘
                     Yes     │     No → Error
                              ▼
                    ┌────────────────────┐
                    │ Already connected? │
                    └────────┬───────────┘
                     No      │     Yes → "Disconnect first"
                              ▼
                    ┌────────────────────┐
                    │  Create connection │
                    │  meter_connections │
                    └────────┬───────────┘
                              │
                    DB Trigger: on_meter_connection_insert
                    → UPDATE meters SET status='connected'
                              │
                              ▼
                    ┌────────────────────┐
                    │    CONNECTED ✓     │
                    │ User's wallet now  │
                    │ powers this meter  │
                    └────────────────────┘
```

### Disconnection (Atomic RPC)

```sql
disconnect_from_meter(p_connection_id UUID):
  1. UPDATE meter_connections SET is_active=false, disconnected_at=now()
     WHERE id=p_connection_id AND user_id=auth.uid() AND is_active=true
  2. If matched: UPDATE meters SET status='available' WHERE id=v_meter_id
```

### Connection Types

| Type | Description |
|---|---|
| `manual_code` | User types meter code |
| `qr_scan` | User scans QR code via camera |
| `nfc` | NFC tap (future) |

---

## 8. MQTT / COMPERE Protocol Integration

### Infrastructure

| Component | Details |
|---|---|
| **MQTT Broker** | Self-hosted EMQX v5 |
| **Server IP** | 207.126.167.78 |
| **MQTT Port** | 1883 (no TLS) |
| **HTTP API Port** | 8081 |
| **Dashboard Port** | 18083 |
| **Protocol** | COMPERE V1.9 |
| **Meter Hardware** | DDS666 4G 3-phase smart meters |

### Data Flow: Inbound Telemetry

```
DDS666 Meter ──MQTT──→ EMQX Broker ──Rule Engine──→ Webhook ──→ mqtt-webhook Edge Function ──→ Database
```

**EMQX Rule Engine SQL:**
```sql
SELECT topic, payload FROM "MQTT_RT_DATA", "MQTT_ENY_NOW", "MQTT_DAY_DATA",
  "MQTT_TELEIND", "MQTT_TELECTRL_REP", "MQTT_METER_TIME_REP",
  "MQTT_SYS_SET_REP", "MQTT_SYS_REPLY", "MQTT_RECONFIG_REPLY",
  "MQTT_COMMOD_SET_REP", "MQTT_COMMOD_READ_REP", "MQTT_RECALL_REP"
```

**Webhook body template:**
```json
{
  "topic": "${topic}",
  "payload": "${payload}",
  "clientid": "${clientid}",
  "timestamp": "${timestamp}"
}
```

**Security:** `X-Webhook-Secret` header validated against `MQTT_WEBHOOK_SECRET` secret.

### COMPERE Topics & Database Mapping

| MQTT Topic | Handler | Database Table | Description |
|---|---|---|---|
| `MQTT_RT_DATA` | `handleRtData` | `mqtt_meter_readings` | Real-time voltage, current, power, frequency |
| `MQTT_ENY_NOW` | `handleEnyNow` | `mqtt_energy_readings` | Energy totals, tariffs, harmonics |
| `MQTT_DAY_DATA` | `handleDayData` | `mqtt_daily_readings` | Daily aggregated readings |
| `MQTT_TELEIND` | `handleTeleind` | `mqtt_meter_status` | Digital I/O states (relay status) |
| `MQTT_TELECTRL_REP` | `handleCommandResponse` | `meter_commands` | Relay control response |
| `MQTT_METER_TIME_REP` | `handleCommandResponse` | `mqtt_operations` | Time sync response |
| `MQTT_SYS_SET_REP` | `handleCommandResponse` | `mqtt_operations` | Parameter write response |
| `MQTT_SYS_REPLY` | `handleCommandResponse` | `mqtt_operations` | Parameter read response |
| `MQTT_RECONFIG_REPLY` | `handleCommandResponse` | `mqtt_operations` | Reconfig response |
| `MQTT_COMMOD_SET_REP` | `handleCommandResponse` | `mqtt_operations` | Upload freq set response |
| `MQTT_COMMOD_READ_REP` | `handleCommandResponse` | `mqtt_operations` | Upload freq read response |
| `MQTT_RECALL_REP` | `handleRecallResponse` | `mqtt_operations` + `mqtt_daily_readings` | Historical data recall |

### COMPERE Payload Key Mapping (RT_DATA)

| COMPERE Key | DB Column | Description |
|---|---|---|
| `MN` | `meter_id` | Meter number (identifier) |
| `Ts` / `time` | `reading_time` | Timestamp (YYYYMMDDHHmmss) |
| `Ua`, `Ub`, `Uc` | `ua`, `ub`, `uc` | Phase voltages (V) |
| `Ia`, `Ib`, `Ic` | `ia`, `ib`, `ic` | Phase currents (A) |
| `Uab`, `Ubc`, `Uca` | `uab`, `ubc`, `uca` | Line-to-line voltages (V) |
| `Pa`, `Pb`, `Pc` | `pa`, `pb`, `pc` | Per-phase active power (kW) |
| `Zyggl` | `zyggl` | Total active power (kW) |
| `Qa`, `Qb`, `Qc` | `qa`, `qb`, `qc` | Per-phase reactive power (kVar) |
| `Zwggl` | `zwggl` | Total reactive power (kVar) |
| `Sa`, `Sb`, `Sc` | `sa`, `sb`, `sc` | Per-phase apparent power (kVA) |
| `Zszgl` | `zszgl` | Total apparent power (kVA) |
| `PFa`, `PFb`, `PFc` | `pfa`, `pfb`, `pfc` | Per-phase power factor |
| `Zglys` | `zglys` | Total power factor |
| `F` | `f` | Frequency (Hz) |

### Data Flow: Outbound Commands

```
Frontend ──API──→ mqtt-meter Edge Function ──HTTP API──→ EMQX Broker ──MQTT──→ DDS666 Meter
```

**Edge Function: `mqtt-meter`** (9 actions)

| Action | MQTT Topic Pattern | Payload | Description |
|---|---|---|---|
| `relay_control` | `MQTT_TELECTRL_{last8}` | `{do1:"0"\|"1", oprid}` | Switch relay on/off |
| `time_sync` | `MQTT_SETTIME_{last8}` | `{oprid, time}` | Sync meter clock to UTC |
| `param_read` | `MQTT_SYS_READ_{last8}` | `{oprid, addr, lenth, type}` | Read Modbus register |
| `param_set` | `MQTT_SYS__CFG_{last8}` | `{oprid, addr, value, type}` | Write Modbus register |
| `upload_freq_set` | `MQTT_COMMOD_SET_{last8}` | `{oprid, Cmd, value, types}` | Set telemetry interval |
| `upload_freq_read` | `MQTT_COMMOD_READ_{last8}` | `{oprid, Cmd, types}` | Read telemetry interval |
| `reconfig` | `MQTT_RECONFIG_{last8}` | `{oprid}` | Reset MQTT connection |
| `data_recall` | `MQTT_RECALL_{last8}` | `{oprid, date, oprtype}` | Recall frozen monthly data |
| `device_info` | — (DB query only) | — | Get meter info + latest reading |

**`{last8}`** = last 8 characters of the meter ID (COMPERE convention).

### Secrets Used

| Secret | Purpose |
|---|---|
| `MQTT_HTTP_API_URL` | EMQX HTTP publish API endpoint |
| `MQTT_HTTP_API_KEY` | Base64 auth for EMQX HTTP API |
| `MQTT_WEBHOOK_SECRET` | Validates inbound webhook calls |

---

## 9. Real-Time Sync Architecture (Planned)

> **Status:** Architecture designed, implementation pending

### The Problem

When a user connects to a meter, the meter consumes electricity. The system needs to:
1. Track consumption in real-time
2. Deduct from the user's cloud wallet
3. Auto-disconnect (relay OFF) when balance reaches zero
4. Auto-reconnect (relay ON) when user recharges

### Hybrid Approach Design

```
┌─────────────┐    MQTT (1-5s)    ┌──────────┐    Webhook    ┌──────────┐
│ COMPERE     │ ───────────────→  │  EMQX    │ ──────────→  │ Server   │
│ Smart Meter │ ←───────────────  │  Broker  │              │ (Edge Fn)│
│             │   Relay ON/OFF    │          │              │          │
└─────────────┘                   └──────────┘              └──────────┘
                                                                 │
                                                    ┌────────────┤
                                                    ▼            ▼
                                              ┌──────────┐ ┌──────────┐
                                              │ Wallet   │ │ Consumption│
                                              │ Deduction│ │ Logs      │
                                              └──────────┘ └──────────┘
```

### Flow Steps

1. **Every telemetry reading (MQTT_ENY_NOW, 1-5 seconds):**
   - Server receives `import_total_active` (cumulative kWh)
   - Calculates delta since last reading
   - Deducts delta from user's wallet via `debit_wallet` RPC
   - If wallet balance ≤ 0 → sends **Relay OFF** via `MQTT_TELECTRL_{last8}`
   - Logs consumption in `consumption_logs`

2. **On M-Pesa recharge (mpesa-payment callback):**
   - Wallet credited
   - Checks if user has active meter connection
   - If yes → sends **Relay ON** via `MQTT_TELECTRL_{last8}`
   - Notification: "Meter reconnected after recharge"

3. **On meter scan/register:**
   - Links COMPERE meter number (MN) to user
   - Sends Relay ON command
   - Sets upload frequency to desired interval

### Required Changes

- Add `mqtt_meter_id` column to `meters` table (maps COMPERE MN → UUID meter)
- Enhance `mqtt-webhook` with consumption tracking + auto-cutoff
- Enhance `mpesa-payment` callback with auto-reconnect (partially done)
- Meter connect flow sends relay ON + sets upload frequency

---

## 10. KPLC B2B Payment Pool

### How It Works

On every successful M-Pesa payment from a user:

```
User pays KES 100
├── Commission (10%): KES 10 → retained by operator
└── KPLC portion (90%): KES 90 → added to pool
    └── Pool balance checked:
        ├── < KES 25 → wait for more payments
        └── ≥ KES 25 → trigger B2B payment to KPLC paybill 888880
```

### Edge Function: `kplc-b2b`

| Action | Method | Description |
|---|---|---|
| `process_pool` | POST | Check pool, initiate B2B if threshold met |
| `b2b_callback` | POST | Safaricom B2B result (marks splits as forwarded) |
| `b2b_timeout` | POST | Safaricom B2B timeout handler |
| `pool_status` | GET | Admin: pool balance, commission totals, settings |
| `update_settings` | POST | Admin: update system settings |

### Payment Split Record

```json
{
  "transaction_id": "uuid",
  "user_id": "uuid",
  "original_amount_kes": 100,
  "commission_percent": 10,
  "commission_amount_kes": 10,
  "kplc_amount_kes": 90,
  "forwarded": false,
  "kplc_payment_id": null
}
```

### B2B Trigger Points

1. **Inline:** After each successful M-Pesa callback (fire-and-forget)
2. **Cron:** Every 10 minutes (scheduled job)

### Configurable Settings

| Key | Default | Description |
|---|---|---|
| `commission_percent` | 10 | Operator's commission % |
| `kplc_paybill` | 888880 | KPLC paybill number |
| `kplc_account_number` | — | KPLC account number |
| `kplc_min_payment` | 25 | Minimum KES for B2B trigger |
| `resale_rate_kes_per_kwh` | 24 | Rate charged to users |

---

## 11. P2P Energy Transfers

### Edge Function: `p2p-transfer`

Users can send kWh to other users by phone number.

### Constraints

| Rule | Value |
|---|---|
| Minimum transfer | 0.5 kWh |
| Maximum per transfer | 50 kWh |
| Daily limit | 50 kWh total |
| Rate limit | 5 transfers/minute |
| Self-transfer | Blocked |

### Flow

```
1. Sender enters recipient phone + amount
2. Server validates:
   - Rate limit check
   - Daily limit check
   - Sufficient balance check (optimistic lock)
   - Recipient lookup (profiles table, phone variants)
3. Atomic operations:
   a. Debit sender wallet (with optimistic lock on balance_kwh)
   b. Credit recipient wallet
   c. Create transfer_out transaction (sender)
   d. Create transfer_in transaction (recipient)
4. Notifications to both parties
```

### Optimistic Locking

```sql
UPDATE wallets SET balance_kwh = new_balance
WHERE user_id = sender_id AND balance_kwh = original_balance;
-- If 0 rows affected → balance changed, return 409 Conflict
```

---

## 12. IoT Hub

### Architecture

The IoT Hub (`/iot`) provides a modular dashboard for smart home/building management:

| Module | Protocol | Features |
|---|---|---|
| Smart Lighting | WiFi/Zigbee | On/off, dimming, color, schedules |
| Security | WiFi/BLE | Cameras, motion sensors, door locks |
| Water/Irrigation | WiFi | Tank levels, flow monitoring, irrigation |
| Smart Breakers | MQTT | Circuit monitoring, remote trip/reset |
| Climate/HVAC | WiFi/Zigbee | Temperature, humidity, fan control |

### Module System

```typescript
// src/lib/iot-modules.ts — Registry
const modules = {
  lighting: { name: "Smart Lighting", icon: Lightbulb, protocols: ["WiFi", "Zigbee"] },
  security: { name: "Security", icon: Shield, protocols: ["WiFi", "BLE"] },
  // ...
};
```

Users toggle modules in IoT Settings panel. State persisted to localStorage.

### Key UI Components

- `AnimatedWaterTank` — SVG-animated water level visualization
- `EditableDeviceName` — Inline device renaming
- `CircuitBreakerWidget` — Real-time breaker status
- `EnergyMeterWidget` — Live meter telemetry display

---

## 13. Admin Dashboard

### Access Control

Admin access is determined by the `user_roles` table using RBAC:

```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Security definer function (prevents RLS recursion)
CREATE FUNCTION has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
  SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
  $$;
```

> **Note:** Legacy `is_admin` boolean on `profiles` table still exists for backward compatibility but RBAC via `user_roles` is the authoritative source.

### Admin Routes

| Route | Component | Description |
|---|---|---|
| `/admin/dashboard` | AdminDashboard | Overview stats, revenue, users |
| `/admin/users` | AdminUsers | User management |
| `/admin/meters` | AdminMeters | Meter fleet management |
| `/admin/transactions` | AdminTransactions | Payment history |
| `/admin/settings` | AdminSettings | System configuration |
| `/admin/analytics` | Placeholder | Revenue charts (planned) |
| `/admin/kplc` | Placeholder | B2B pool status (planned) |
| `/admin/meter-commands` | Placeholder | MQTT command history (planned) |

### Admin Edge Function: `admin-api`

Provides admin-only endpoints for user management, meter operations, and system configuration.

---

## 14. Database Schema

### Core Tables

| Table | Purpose | RLS Policy |
|---|---|---|
| `profiles` | User info (name, phone, PIN hash) | Own records only |
| `wallets` | Energy balance per user | Own records only |
| `transactions` | All financial records | SELECT own only |
| `meters` | Physical smart meters | ALL own only |
| `meter_connections` | Active user-meter links | ALL own only |
| `meter_transfers` | Wallet→meter transfer audit | SELECT only (immutable) |
| `consumption_logs` | Historical consumption | SELECT own only |
| `notifications` | User notifications | SELECT + UPDATE own |
| `payment_splits` | Commission/KPLC split records | SELECT own only |
| `kplc_payments` | B2B payments to KPLC | Service role only |
| `system_settings` | Configurable key-value store | SELECT for authenticated |
| `user_roles` | RBAC role assignments | SELECT own only |

### MQTT/COMPERE Tables

| Table | Purpose | RLS Policy |
|---|---|---|
| `mqtt_meter_readings` | Real-time telemetry (V, A, W, Hz) | Service role only |
| `mqtt_energy_readings` | Energy totals, tariffs, harmonics | Service role only |
| `mqtt_daily_readings` | Daily aggregated readings | Service role only |
| `mqtt_meter_status` | Digital I/O states | Service role only |
| `mqtt_operations` | Outbound command tracking | Service role only |
| `meter_commands` | Relay control commands | SELECT own only |

### Supporting Tables

| Table | Purpose |
|---|---|
| `meter_readings` | Legacy readings (UUID meter_id) |
| `meter_link_requests` | Tuya device link requests |
| `rate_limit_events` | Rate limiting tracking |

### Key Database Functions

| Function | Purpose | Type |
|---|---|---|
| `credit_wallet` | Atomic wallet credit | SECURITY DEFINER |
| `debit_wallet` | Atomic wallet debit | SECURITY DEFINER |
| `disconnect_from_meter` | Atomic meter disconnect | SECURITY DEFINER |
| `set_pin` / `verify_pin` / `has_pin` / `reset_pin` | PIN management | SECURITY DEFINER |
| `upsert_profile` | Create/update profile | SECURITY DEFINER |
| `insert_notification` | Create notification | SECURITY DEFINER |
| `check_rate_limit` | Rate limit check + insert | SECURITY DEFINER |
| `has_role` | RBAC role check | SECURITY DEFINER |
| `create_wallet_for_new_user` | Trigger function | SECURITY DEFINER |

### Database Triggers

| Trigger | Table | Function | Purpose |
|---|---|---|---|
| (on INSERT) | `meter_connections` | `on_meter_connection_insert` | Set meter status → "connected" |
| (on INSERT) | `profiles` | `create_wallet_for_new_user` | Auto-create wallet |

---

## 15. Edge Functions Reference

### Summary

| Function | JWT Verify | Description |
|---|---|---|
| `mpesa-payment` | false | M-Pesa STK Push + callback |
| `daraja-stk-query` | false | Direct Safaricom STK query |
| `meter-connect` | false | Meter connect/disconnect/history |
| `mqtt-meter` | false | MQTT commands to meters |
| `mqtt-webhook` | false | Inbound MQTT telemetry ingestion |
| `p2p-transfer` | false | User-to-user energy transfers |
| `kplc-b2b` | false | KPLC B2B payment pool |
| `consumption-stats` | false | Consumption analytics |
| `tuya-meter` | false | Tuya IoT integration |
| `admin-api` | false | Admin management endpoints |
| `ai-energy-insights` | false | AI-powered energy analysis |

> **Note:** All functions have `verify_jwt = false` in config.toml but implement their own auth validation in code (checking `Authorization` header). The callback/webhook endpoints use service role keys or webhook secrets.

### Action Routing Pattern

All edge functions use `?action=<name>` query parameter for routing:

```
POST /functions/v1/mpesa-payment?action=initiate_stk_push
POST /functions/v1/mpesa-payment?action=callback
GET  /functions/v1/mpesa-payment?action=check_status&transaction_id=...
```

---

## 16. Security Architecture

### Row-Level Security (RLS)

Every table has RLS enabled. Policies ensure:
- Users can only access their own data
- Service role (backend) can access all data
- MQTT tables: service role only (webhook writes, admin reads)
- System settings: authenticated read, no client write

### Rate Limiting

Database-backed rate limiting system:

```
rate_limit_events table
├── user_id
├── action (e.g., "stk_push_initiate", "meter_connect", "p2p_transfer")
├── created_at
└── Cleanup: probabilistic (1% chance) removes events > 1 hour old
```

| Action | Limit | Window |
|---|---|---|
| STK Push | 2 requests | 60 seconds |
| Meter Connect | 3 attempts | 60 seconds |
| P2P Transfer | 5 transfers | 60 seconds |

### PII Protection

- `profiles_safe` view excludes `pin_hash` column
- View uses `security_invoker = true`
- Anonymous access explicitly revoked

### Input Validation

- Phone numbers: sanitized, format validated (9-15 digits)
- Amounts: range-checked (KES 10-150,000 for recharges)
- Meter codes: max 50 chars, trimmed
- All edge functions validate auth tokens before processing

### Webhook Security

MQTT webhook validates `X-Webhook-Secret` header:
```typescript
const webhookSecret = Deno.env.get("MQTT_WEBHOOK_SECRET");
const provided = req.headers.get("X-Webhook-Secret");
if (!webhookSecret || provided !== webhookSecret) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

---

## 17. Frontend Architecture

### Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite (SWC) | Build tool |
| Tailwind CSS | Styling |
| shadcn/ui (Radix) | Component library |
| React Router v6 | Client-side routing |
| TanStack React Query | Server state management |
| Framer Motion | Animations |
| Recharts | Charts/analytics |
| Capacitor | Android native builds |
| vite-plugin-pwa | Service worker + offline |

### Path Alias

`@/` maps to `./src/`

### Theming

- Dark theme by default (ThemeProvider + next-themes)
- Brand colors: Navy background, cyan accent
- Glassmorphic cards: `glass-card` CSS class
- Custom gradients: `gradient-navy`, `gradient-cyan`, `gradient-wallet`
- Custom animations: `fade-in-up`, `scale-in`, `slide-up`, `pulse-ring`, `float`, `shimmer`

### Page Structure

| Route | Page | Protected | Description |
|---|---|---|---|
| `/` | Home | ✅ | Dashboard with wallet, recent transactions |
| `/recharge` | Recharge | ✅ | M-Pesa STK Push payment |
| `/analytics` | Analytics | ✅ | Consumption charts & stats |
| `/transfer` | Transfer | ✅ | P2P energy transfers |
| `/meters` | Meters | ✅ | Meter connect/disconnect |
| `/iot` | IoT Hub | ✅ | Smart device management |
| `/profile` | Profile | ✅ | User settings |
| `/notifications` | Notifications | ✅ | Notification center |
| `/install` | Install | ❌ | PWA install guide |
| `/auth/*` | Auth pages | ❌ | Login, Register, PIN setup |
| `/admin/*` | Admin pages | ✅ (Admin) | Admin dashboard |

### Key Frontend Files

| File | Purpose |
|---|---|
| `src/lib/api.ts` | Client-side API wrappers for edge functions |
| `src/lib/mqtt-client-api.ts` | MQTT meter operations + telemetry queries |
| `src/hooks/useAuth.tsx` | Auth context provider |
| `src/components/AuthGuard.tsx` | Protected route wrapper |
| `src/components/AdminGuard.tsx` | Admin route wrapper |
| `src/components/AppLockScreen.tsx` | PIN unlock screen |
| `src/components/home/HomeDataProvider.tsx` | Home page data fetching |
| `src/components/LiveTelemetry.tsx` | Real-time meter data display |
| `src/components/MqttMeterDashboard.tsx` | MQTT meter management UI |

### Home Page Themes

Three interchangeable home page designs:
- `HomeCyberpunk` — Futuristic neon aesthetic
- `HomeMinimal` — Clean, card-based layout
- `HomeOcean` — Blue/wave-themed design

---

## 18. Notification System

### Types

| Type | Triggers |
|---|---|
| `payment` | Successful/failed M-Pesa payments |
| `transfer` | P2P send/receive |
| `meter` | Connect/disconnect, auto-reconnect |
| `low_balance` | Wallet below threshold |
| `system` | System announcements |

### Implementation

- **Creation:** Server-side via `insert_notification` RPC (SECURITY DEFINER)
- **Storage:** `notifications` table with RLS (own records only)
- **Display:** In-app notification page + unread count badge on home
- **Icons:** Emoji-based (💳, 📤, 🟢, ⚡, 🔌, ❌)

---

## 19. Deployment & Infrastructure

### Frontend

- **Hosting:** Lovable platform (auto-deploys on commit)
- **PWA:** Service worker for offline caching
- **Capacitor:** Android APK builds configured

### Backend

- **Platform:** Supabase (via Lovable Cloud)
- **Edge Functions:** Auto-deployed Deno functions
- **Database:** PostgreSQL with RLS
- **Auth:** Supabase Auth

### MQTT Broker

- **Platform:** Self-hosted EMQX v5
- **Server:** 207.126.167.78
- **Access:** Direct IP (no TLS currently)
- **Rule Engine:** Configured to forward 12 COMPERE topics to webhook

### Secrets Management

All API keys stored as Supabase secrets (not in code):

| Secret | Service |
|---|---|
| `DARAJA_*` (4 keys) | Safaricom M-Pesa |
| `MQTT_*` (3 keys) | EMQX Broker |
| `TUYA_*` (3 keys) | Tuya IoT Platform |
| `SUPABASE_*` (4 keys) | Auto-configured |
| `LOVABLE_API_KEY` | AI features |

---

## 20. Rate Limiting

### System Design

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Edge Func  │────→│ check_rate_limit │────→│ rate_limit_events│
│  (any)      │     │     (RPC)        │     │    (table)       │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                    Returns true/false
                    (within limit or not)
```

The `check_rate_limit` RPC:
1. Inserts a new event record
2. Randomly (1% chance) triggers cleanup of events > 1 hour old
3. Counts recent events within the window
4. Returns `count <= limit`

---

## 21. Error Handling

### Frontend

- **Toast notifications:** Sonner library for success/error messages
- **Try-catch:** All API calls wrapped with user-friendly error messages
- **Loading states:** Skeleton components during data fetch
- **Offline indicator:** Shows banner when network is down

### Backend

- **Structured errors:** All edge functions return `{ error: "message" }` with appropriate HTTP status codes
- **Non-fatal errors:** Payment splits, notifications, auto-reconnect failures don't break the main flow
- **Logging:** `console.error` with context tags (e.g., `[RT_DATA]`, `[Webhook]`)
- **Graceful degradation:** Legacy table writes silently fail if meter_id format doesn't match

### Status Codes

| Code | Usage |
|---|---|
| 200 | Success |
| 400 | Bad request / validation error |
| 401 | Unauthorized |
| 404 | Resource not found |
| 409 | Conflict (optimistic lock failure) |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Appendix A: Environment Variables

### Frontend (.env — auto-configured)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key for client SDK |
| `VITE_SUPABASE_PROJECT_ID` | Project ID for URL construction |

### Backend (Supabase Secrets)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Internal Supabase URL |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) |
| `SUPABASE_DB_URL` | Direct database connection string |
| `DARAJA_CONSUMER_KEY` | M-Pesa API key |
| `DARAJA_CONSUMER_SECRET` | M-Pesa API secret |
| `DARAJA_SHORTCODE` | M-Pesa business shortcode |
| `DARAJA_PASSKEY` | M-Pesa STK passkey |
| `MQTT_HTTP_API_URL` | EMQX HTTP publish endpoint |
| `MQTT_HTTP_API_KEY` | EMQX HTTP API auth |
| `MQTT_WEBHOOK_SECRET` | Webhook validation secret |
| `TUYA_CLIENT_ID` | Tuya IoT client ID |
| `TUYA_CLIENT_SECRET` | Tuya IoT client secret |
| `TUYA_BASE_URL` | Tuya API base URL |
| `LOVABLE_API_KEY` | Lovable AI API key |

---

## Appendix B: Build & Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests (vitest)
```

---

*This document reflects the system as of March 8, 2026. The real-time sync architecture (Section 9) is designed but pending implementation.*
