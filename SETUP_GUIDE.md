# Flow Charge Cloud - Setup & Deployment Guide

## 🚀 Quick Start

This guide covers setting up M-Pesa integration and wallet-to-meter transfer functionality.

---

## 📋 Prerequisites

- [x] Supabase project created
- [x] Node.js 18+ installed
- [ ] Safaricom Daraja API credentials
- [ ] Tuya IoT Platform account
- [ ] Supabase CLI installed

---

## 1️⃣ Database Setup

### Apply Migrations

Run the new transactions migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase Dashboard SQL Editor
# Copy and paste the content of:
# supabase/migrations/20260227212400_create_transactions.sql
```

### Verify Tables

After migration, you should have:
- ✅ `transactions` table
- ✅ `meter_transfers` table  
- ✅ RLS policies enabled
- ✅ Indexes created

---

## 2️⃣ M-Pesa Setup (Safaricom Daraja)

### Get API Credentials

1. Visit [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Create an app (or use existing)
3. Note down:
   - **Consumer Key**
   - **Consumer Secret**
   - **Passkey** (for STK Push)
   - **Business Short Code**

### Test vs Production

**Sandbox** (Testing):
- Use short code: `174379`
- Test phone numbers provided by Safaricom
- Base URL: `https://sandbox.safaricom.co.ke`

**Production**:
- Use your live Paybill or Till Number
- Real phone numbers
- Base URL: `https://api.safaricom.co.ke`

---

## 3️⃣ Environment Variables

### Supabase Secrets (Edge Functions)

Set these secrets in your Supabase project:

```bash
# M-Pesa Configuration
supabase secrets set MPESA_CONSUMER_KEY=your_consumer_key_here
supabase secrets set MPESA_CONSUMER_SECRET=your_consumer_secret_here
supabase secrets set MPESA_BUSINESS_SHORT_CODE=174379
supabase secrets set MPESA_PASSKEY=your_passkey_here
supabase secrets set MPESA_ENVIRONMENT=sandbox
supabase secrets set MPESA_CALLBACK_URL=https://[your-project-ref].supabase.co/functions/v1/mpesa-payment?action=callback

# Tuya Configuration (already set)
supabase secrets set TUYA_CLIENT_ID=your_tuya_client_id
supabase secrets set TUYA_CLIENT_SECRET=your_tuya_secret
supabase secrets set TUYA_BASE_URL=https://openapi.tuyaeu.com
```

### Frontend Environment Variables

Update `.env` file:

```bash
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

---

## 4️⃣ Deploy Edge Functions

### Deploy M-Pesa Function

```bash
cd flow-charge-cloud
supabase functions deploy mpesa-payment
```

### Deploy Updated Tuya Function

```bash
supabase functions deploy tuya-meter
```

### Verify Deployment

```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs mpesa-payment
supabase functions logs tuya-meter
```

---

## 5️⃣ Testing

### Test M-Pesa Integration (Sandbox)

#### 1. Test STK Push

```bash
# Use your Supabase project URL and anon key
curl -X POST "https://[your-project-ref].supabase.co/functions/v1/mpesa-payment?action=initiate_stk_push" \
  -H "Authorization: Bearer [your-auth-token]" \
  -H "Content-Type: application/json" \
  -H "apikey: [your-anon-key]" \
  -d '{
    "phone": "254708374149",
    "amount_kes": 100
  }'
```

Expected response:
```json
{
  "success": true,
  "transaction_id": "uuid-here",
  "checkout_request_id": "ws_CO_...",
  "message": "STK push sent successfully"
}
```

#### 2. Test M-Pesa Sandbox Credentials

Safaricom provides test credentials:
- **Test Phone**: `254708374149`
- **Test PIN**: Will be provided in sandbox docs

#### 3. Check Transaction Status

```bash
curl "https://[your-project-ref].supabase.co/functions/v1/mpesa-payment?action=check_status&transaction_id=[transaction-id]" \
  -H "Authorization: Bearer [your-auth-token]" \
  -H "apikey: [your-anon-key]"
```

### Test Wallet-to-Meter Transfer

```bash
curl -X POST "https://[your-project-ref].supabase.co/functions/v1/tuya-meter?action=transfer_to_meter" \
  -H "Authorization: Bearer [your-auth-token]" \
  -H "Content-Type: application/json" \
  -H "apikey: [your-anon-key]" \
  -d '{
    "meter_id": "meter-uuid-here",
    "kwh_amount": 10
  }'
```

Expected response:
```json
{
  "success": true,
  "transaction_id": "uuid-here",
  "wallet_balance": 90.5,
  "meter_balance": 60.3,
  "transferred": 10,
  "message": "Successfully transferred 10 kWh to [Meter Name]"
}
```

### Frontend Testing

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Test recharge flow**:
   - Navigate to `/recharge`
   - Enter amount (minimum 10 KES)
   - Enter M-Pesa number
   - Click "Confirm & Pay"
   - Check your phone for STK push
   - Enter PIN to complete

3. **Test meter transfer**:
   - Navigate to `/meters`
   - Click on a meter
   - Click "Recharge Meter" (you'll need to add this UI)
   - Enter kWh amount
   - Confirm transfer

---

## 6️⃣ Production Deployment

### Switch to Production M-Pesa

1. Update secrets:
   ```bash
   supabase secrets set MPESA_ENVIRONMENT=production
   supabase secrets set MPESA_BUSINESS_SHORT_CODE=[your-live-short-code]
   supabase secrets set MPESA_PASSKEY=[your-production-passkey]
   ```

2. Update callback URL on Daraja portal
3. Redeploy function:
   ```bash
   supabase functions deploy mpesa-payment
   ```

### Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to Netlify/Vercel/etc
# Or use Supabase hosting
```

---

## 🔍 Troubleshooting

### M-Pesa Issues

#### STK Push Not Received
- ✅ Verify phone number format (254...)
- ✅ Check M-Pesa is active on phone
- ✅ Confirm Safaricom credentials are correct
- ✅ Check edge function logs

#### Callback Not Working
- ✅ Verify callback URL is publicly accessible
- ✅ Check Supabase function logs
- ✅ Ensure CORS is configured correctly
- ✅ Verify transaction exists in database

#### Payment Stuck in "Pending"
- Users have ~60 seconds to complete STK push
- Check transaction status manually in database
- User may have cancelled on their phone

### Wallet-to-Meter Transfer Issues

#### "Insufficient Balance" Error
- Check wallet balance in database
- Verify amount being transferred
- Ensure frontend is displaying correct balance

#### Transfer Succeeds but Meter Not Updated
- Check meter_transfers table for record
- Verify meter ID is correct
- Check Tuya API connectivity (optional sync)

#### Rollback Not Working
- Check transaction status in database
- Verify error logs in Supabase
- May need manual intervention

---

## 📊 Monitoring

### Key Metrics to Track

1. **M-Pesa Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
   FROM transactions 
   WHERE type = 'recharge' 
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Average Transaction Time**
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
   FROM transactions 
   WHERE status = 'completed' 
   AND type = 'recharge';
   ```

3. **Failed Transactions**
   ```sql
   SELECT * FROM transactions 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Edge Function Logs

Monitor in real-time:
```bash
supabase functions logs mpesa-payment --tail
supabase functions logs tuya-meter --tail
```

---

## 🔐 Security Checklist

- [ ] Environment secrets are set (not in code)
- [ ] RLS policies are enabled on all tables
- [ ] Callback URL is using HTTPS
- [ ] Rate limiting configured (Supabase has built-in)
- [ ] Input validation on amounts (min/max)
- [ ] Transaction rollbacks implemented
- [ ] Error messages don't expose sensitive data
- [ ] Audit logs enabled for critical operations

---

## 🐛 Common Errors & Solutions

### Error: "Unauthorized"
**Solution**: Ensure valid auth token is passed in Authorization header

### Error: "Failed to get M-Pesa token"
**Solution**: Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET

### Error: "Transaction not found"
**Solution**: Verify transaction_id exists and belongs to current user

### Error: "Transfer would exceed meter capacity"
**Solution**: Check meter's max_kwh and current balance_kwh

### Error: "Wallet not found"
**Solution**: Ensure wallet was created during user registration (check trigger)

---

## 📱 Mobile App Deployment

If building with Capacitor:

```bash
# Sync with native projects
npx cap sync

# Build Android
cd android && ./gradlew assembleDebug

# Build iOS
cd ios && xcodebuild ...
```

---

## 🎉 Testing Checklist

Before going live:

- [ ] M-Pesa STK push works in sandbox
- [ ] Callback handler processes successful payments
- [ ] Callback handler processes failed payments
- [ ] Wallet balance updates correctly
- [ ] Transaction records are created
- [ ] Wallet-to-meter transfer works
- [ ] Insufficient balance is handled
- [ ] Meter capacity checks work
- [ ] Transaction rollbacks function
- [ ] Frontend displays correct balances
- [ ] Error messages are user-friendly
- [ ] Loading states are smooth

---

## 📚 Additional Resources

- [Safaricom Daraja Docs](https://developer.safaricom.co.ke/Documentation)
- [Tuya API Docs](https://developer.tuya.com/en/docs/iot/open-api/api-reference/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## 💬 Support

If you encounter issues:
1. Check edge function logs
2. Verify environment variables
3. Test in sandbox mode first
4. Review transaction records in database
5. Check network requests in browser DevTools

---

**Last Updated**: February 27, 2026  
**Version**: 1.0.0
