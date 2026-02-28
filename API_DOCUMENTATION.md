# PowerFlow API Documentation

## Overview
PowerFlow uses Supabase Edge Functions (Deno runtime) for all backend APIs. All functions require Bearer authentication via Supabase JWT tokens unless specified otherwise (e.g. callbacks).

**Base URL**: `https://[your-project].supabase.co/functions/v1`

---

## Authentication
All authenticated endpoints require:
```
Authorization: Bearer <supabase_jwt_token>
apikey: <supabase_anon_key>
```

Get token via Supabase client:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;
```

---

## Edge Functions

### 1. M-Pesa Payment (`mpesa-payment`)

#### 1.1 Initiate STK Push
**Endpoint**: `POST /mpesa-payment?action=initiate_stk_push`

**Description**: Initiates M-Pesa STK Push for wallet recharge.

**Request Body**:
```json
{
  "phone": "254712345678",
  "amount_kes": 100
}
```

**Response**:
```json
{
  "success": true,
  "transaction_id": "uuid",
  "checkout_request_id": "ws_CO_...",
  "merchant_request_id": "...",
  "message": "STK push sent successfully"
}
```

**Rate Limit**: 5 requests per minute per user

---

#### 1.2 Check Transaction Status
**Endpoint**: `GET /mpesa-payment?action=check_status&transaction_id={id}`

**Description**: Check status of a transaction by ID (DB lookup).

**Response**:
```json
{
  "transaction_id": "uuid",
  "status": "completed|pending|failed|cancelled",
  "amount_kwh": 4.17,
  "amount_kes": 100,
  "mpesa_receipt_number": "ABC123XYZ",
  "created_at": "2026-02-28T...",
  "completed_at": "2026-02-28T..."
}
```

---

#### 1.3 M-Pesa Callback (Internal)
**Endpoint**: `POST /mpesa-payment?action=callback`

**Description**: Receives M-Pesa STK Push callback from Safaricom. No auth required (service role only).

**Note**: This endpoint is called by Safaricom servers, not by clients.

---

### 2. STK Query (`daraja-stk-query`)

#### 2.1 Query STK Status
**Endpoint**: `POST /daraja-stk-query`

**Description**: Directly queries Safaricom for STK Push result. Fallback if callback is missed.

**Request Body**:
```json
{
  "checkout_request_id": "ws_CO_..."
}
```

**Response**:
```json
{
  "status": "completed|pending|failed|cancelled|timeout",
  "result_code": 0,
  "result_desc": "The service request is processed successfully.",
  "checkout_request_id": "ws_CO_..."
}
```

---

### 3. Meter Connection (`meter-connect`)

#### 3.1 Connect to Meter
**Endpoint**: `POST /meter-connect?action=connect`

**Description**: Connect user to a physical 4G meter by code.

**Request Body**:
```json
{
  "meter_code": "MTR001",
  "connection_type": "manual_code|qr_scan"
}
```

**Response**:
```json
{
  "success": true,
  "connection": {
    "id": "uuid",
    "user_id": "uuid",
    "meter_id": "uuid",
    "connected_at": "2026-02-28T...",
    "is_active": true
  },
  "meter": {
    "id": "uuid",
    "name": "Kitchen Meter",
    "meter_code": "MTR001",
    "property_name": "Apartment 3B",
    "balance_kwh": 0,
    "max_kwh": 100,
    "status": "connected"
  }
}
```

**Constraints**:
- User can only have 1 active connection at a time
- Meter must have status `available`

---

#### 3.2 Disconnect from Meter
**Endpoint**: `POST /meter-connect?action=disconnect`

**Description**: Disconnect from active meter.

**Request Body**:
```json
{
  "connection_id": "uuid"
}
```

**Response**:
```json
{
  "success": true
}
```

---

#### 3.3 Get Active Connection
**Endpoint**: `GET /meter-connect?action=active`

**Description**: Get user's current active meter connection.

**Response**:
```json
{
  "connection": {
    "connection_id": "uuid",
    "meter_id": "uuid",
    "meter_code": "MTR001",
    "meter_name": "Kitchen Meter",
    "property_name": "Apartment 3B",
    "wallet_balance": 25.5,
    "connected_at": "2026-02-28T..."
  }
}
```

Returns `{ "connection": null }` if no active connection.

---

#### 3.4 Get Connection History
**Endpoint**: `GET /meter-connect?action=history`

**Description**: Get user's past meter connections (last 20).

**Response**:
```json
{
  "connections": [
    {
      "id": "uuid",
      "meter_id": "uuid",
      "connected_at": "2026-02-28T...",
      "disconnected_at": "2026-02-28T...",
      "total_consumed_kwh": 15.3,
      "meters": {
        "name": "Kitchen Meter",
        "meter_code": "MTR001",
        "property_name": "Apartment 3B"
      }
    }
  ]
}
```

---

#### 3.5 Get Consumption Stats
**Endpoint**: `GET /meter-connect?action=consumption_stats`

**Description**: Get stats for active connection (total consumed, rate, estimated time remaining).

**Response**:
```json
{
  "connected": true,
  "total_consumed": 12.5,
  "rate_per_hour": 0.35,
  "wallet_balance": 25.5,
  "estimated_hours_remaining": 72.9,
  "estimated_days_remaining": 3.0
}
```

---

### 4. P2P Energy Transfer (`p2p-transfer`)

#### 4.1 Send Transfer
**Endpoint**: `POST /p2p-transfer?action=send`

**Description**: Send energy (kWh) to another user by phone number.

**Request Body**:
```json
{
  "recipient_phone": "254712345678",
  "amount_kwh": 5.0
}
```

**Response**:
```json
{
  "success": true,
  "transaction_id": "uuid",
  "amount_kwh": 5.0,
  "amount_kes": 120,
  "recipient_phone": "254712345678",
  "recipient_name": "Jane Doe",
  "new_balance": 15.5
}
```

**Constraints**:
- Daily limit: 50 kWh
- Minimum transfer: 0.5 kWh
- Cannot send to self
- Sufficient wallet balance required

**Rate Limit**: 10 transfers per day per user

---

#### 4.2 Get Daily Usage
**Endpoint**: `GET /p2p-transfer?action=daily_usage`

**Description**: Check how much you've transferred today.

**Response**:
```json
{
  "used_today": 10.5,
  "daily_limit": 50.0,
  "remaining": 39.5
}
```

---

#### 4.3 Get Transfer History
**Endpoint**: `GET /p2p-transfer?action=history`

**Description**: Get last 30 P2P transfers (sent + received).

**Response**:
```json
{
  "transfers": [
    {
      "id": "uuid",
      "type": "transfer_out|transfer_in",
      "amount_kwh": 5.0,
      "amount_kes": 120,
      "status": "completed",
      "recipient_phone": "254712...",
      "created_at": "2026-02-28T...",
      "metadata": {
        "recipient_name": "Jane Doe"
      }
    }
  ]
}
```

---

### 5. Consumption Stats (`consumption-stats`)

#### 5.1 Get Daily Consumption
**Endpoint**: `GET /consumption-stats?action=daily`

**Description**: Last 7 days of consumption.

**Response**:
```json
{
  "data": [
    {
      "day": "Mon",
      "date": "2026-02-24",
      "kwh": 7.2
    }
  ]
}
```

---

#### 5.2 Get Weekly Consumption
**Endpoint**: `GET /consumption-stats?action=weekly`

**Description**: Last 4 weeks grouped by week.

**Response**:
```json
{
  "data": [
    {
      "week": "W1",
      "kwh": 50.4
    }
  ]
}
```

---

#### 5.3 Get Monthly Consumption
**Endpoint**: `GET /consumption-stats?action=monthly`

**Description**: Last 3 months with cost calculation.

**Response**:
```json
{
  "data": [
    {
      "month": "February",
      "kwh": 150.5,
      "cost": 3612
    }
  ]
}
```

---

#### 5.4 Get Hourly Consumption
**Endpoint**: `GET /consumption-stats?action=hourly`

**Description**: Today's consumption by hour (6 AM - 11 PM).

**Response**:
```json
{
  "data": [
    {
      "hr": "6AM",
      "kw": 0.25
    }
  ]
}
```

---

#### 5.5 Get Summary
**Endpoint**: `GET /consumption-stats?action=summary`

**Description**: Aggregate stats (this month, vs last month, daily avg, peak hour).

**Response**:
```json
{
  "this_month": 150.5,
  "last_month": 140.2,
  "week_total": 50.4,
  "daily_avg": 7.2,
  "change_percent": 7,
  "peak_hour": "6 PM"
}
```

---

### 6. KPLC B2B Payment (`kplc-b2b`)

**Note**: All actions use service role key. Not directly called by clients.

#### 6.1 Process Pool
**Endpoint**: `POST /kplc-b2b?action=process_pool`

**Description**: Check unforwarded KPLC pool; if ≥ threshold, send B2B payment to KPLC paybill 888880.

Called by:
- M-Pesa callback (fire-and-forget)
- Cron job (every 10 minutes)

---

#### 6.2 B2B Callback
**Endpoint**: `POST /kplc-b2b?action=b2b_callback`

**Description**: Receives Safaricom B2B result callback. Marks splits as forwarded on success.

---

#### 6.3 B2B Timeout
**Endpoint**: `POST /kplc-b2b?action=b2b_timeout`

**Description**: Receives Safaricom B2B timeout callback.

---

#### 6.4 Pool Status (Admin)
**Endpoint**: `GET /kplc-b2b?action=pool_status`

**Description**: Get pool balance, commission totals, recent KPLC payments.

**Response**:
```json
{
  "pool_balance": 1250.50,
  "total_commission": 500.20,
  "pending_splits": 15,
  "recent_payments": [...],
  "settings": {
    "commission_percent": 10,
    "kplc_min_payment": 25
  }
}
```

---

#### 6.5 Update Settings (Admin)
**Endpoint**: `POST /kplc-b2b?action=update_settings`

**Request Body**:
```json
{
  "commission_percent": 10,
  "kplc_min_payment": 25
}
```

---

## Database Direct Access (via Supabase Client)

### Notifications
```typescript
// Get unread notifications
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('read', false)
  .order('created_at', { ascending: false });

// Mark as read
await supabase
  .from('notifications')
  .update({ read: true })
  .eq('id', notificationId);
```

### Transactions
```typescript
// Get recent transactions
const { data } = await supabase
  .from('transactions')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);
```

### Wallet
```typescript
// Get wallet balance
const { data } = await supabase
  .from('wallets')
  .select('balance_kwh, max_kwh')
  .single();
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error, missing params)
- `401` - Unauthorized (invalid/missing auth token)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (e.g. optimistic locking failed)
- `500` - Internal Server Error

---

## Rate Limiting

Rate limits are enforced per user per endpoint:
- M-Pesa STK Push: 5/minute
- P2P Transfers: 10/day (50 kWh/day limit)
- Other endpoints: No explicit limit (rely on Supabase edge function quotas)

---

## Security

### Authentication
- All requests use Supabase JWT (issued on login)
- Row-Level Security (RLS) enforces user data isolation

### PIN Verification
- 4-digit PIN hashed with SHA-256 + salt client-side
- Failed attempts tracked (5 failures = 15-minute lockout)

### Biometric Auth
- WebAuthn platform authenticator (fingerprint/Face ID)
- Credential stored in browser, verified on device

### Audit Logs
- All sensitive actions logged to `audit_logs` table
- Includes: user_id, action, timestamp, metadata

---

## Business Logic

### Energy Consumption Model
1. User recharges wallet via M-Pesa (KES → kWh at KES 24/kWh)
2. User connects to a 4G meter
3. Every 5 minutes, `process_energy_consumption()` deducts from wallet based on meter's `consumption_rate_per_hour`
4. Low balance alert at 5 kWh threshold
5. Zero balance stops consumption

### Payment Split (KPLC Forwarding)
1. User pays KES X via M-Pesa
2. 10% commission retained, 90% allocated to KPLC pool
3. When pool ≥ KES 25, M-Pesa B2B payment sent to KPLC (paybill 888880)
4. On success, splits marked `forwarded = true`

---

## Environment Variables

### Edge Functions
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# M-Pesa (Production)
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=... # For password generation
MPESA_TILL_NUMBER=4159923 # Buy Goods Till
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://your-project.supabase.co/functions/v1/mpesa-payment?action=callback

# M-Pesa B2B (KPLC Payments)
MPESA_B2B_INITIATOR_NAME=...
MPESA_B2B_SECURITY_CREDENTIAL=... # Encrypted with Safaricom cert
MPESA_B2B_RESULT_URL=https://your-project.supabase.co/functions/v1/kplc-b2b?action=b2b_callback
MPESA_B2B_TIMEOUT_URL=https://your-project.supabase.co/functions/v1/kplc-b2b?action=b2b_timeout
```

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJh...
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Deployment

### Edge Functions
```bash
# Deploy single function
supabase functions deploy mpesa-payment

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs mpesa-payment --tail
```

### Database Migrations
```bash
# Apply migrations
supabase db push

# Reset database (dev only)
supabase db reset
```

---

## Testing

Run tests:
```bash
npm run test        # Run once
npm run test:watch  # Watch mode
npx vitest run src/lib/api.test.ts  # Single file
```

---

## Support

For issues or questions, contact the PowerFlow dev team.

**Version**: 1.0.0  
**Last Updated**: February 2026
