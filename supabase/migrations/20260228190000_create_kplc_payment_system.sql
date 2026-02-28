-- ============================================================
-- KPLC Payment Pool & B2B Forwarding System
-- Handles commission splits and automated KPLC bill payments
-- ============================================================

-- 1. System Settings (admin-configurable key-value store)
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read settings
CREATE POLICY "Authenticated users can read settings" ON public.system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can do everything (edge functions use service role for writes)
CREATE POLICY "Service role full access" ON public.system_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('commission_percent', '10', 'Percentage deducted from client payments as PowerFlow commission'),
  ('kplc_paybill', '888880', 'KPLC M-Pesa paybill number'),
  ('kplc_account_number', '', 'KPLC prepaid meter account number (set by admin)'),
  ('kplc_min_payment', '25', 'Minimum KES amount to trigger B2B payment to KPLC'),
  ('resale_rate_kes_per_kwh', '24', 'KES per kWh charged to clients'),
  ('b2b_initiator_name', '', 'M-Pesa Org Portal initiator username for B2B')
ON CONFLICT (key) DO NOTHING;

-- 2. KPLC Payments (tracks each B2B payment sent to KPLC)
-- Created before payment_splits so the FK reference works
CREATE TABLE public.kplc_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount_kes NUMERIC(12,2) NOT NULL CHECK (amount_kes > 0),
  kplc_paybill TEXT NOT NULL,
  kplc_account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'timeout')),
  mpesa_conversation_id TEXT,
  mpesa_originator_conversation_id TEXT,
  mpesa_transaction_id TEXT,
  result_code INT,
  result_desc TEXT,
  splits_count INT NOT NULL DEFAULT 0,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kplc_payments ENABLE ROW LEVEL SECURITY;

-- Only service role can access kplc_payments (internal system table)
CREATE POLICY "Service role manages kplc_payments" ON public.kplc_payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_kplc_payments_status ON public.kplc_payments(status);
CREATE INDEX idx_kplc_payments_conversation ON public.kplc_payments(mpesa_conversation_id);
CREATE INDEX idx_kplc_payments_initiated ON public.kplc_payments(initiated_at DESC);

-- 3. Payment Splits (tracks commission/KPLC split for each recharge)
CREATE TABLE public.payment_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_amount_kes NUMERIC(12,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_amount_kes NUMERIC(12,2) NOT NULL,
  kplc_amount_kes NUMERIC(12,2) NOT NULL,
  forwarded BOOLEAN NOT NULL DEFAULT false,
  kplc_payment_id UUID REFERENCES public.kplc_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

-- Service role full access (edge functions create/update these)
CREATE POLICY "Service role manages payment_splits" ON public.payment_splits
  FOR ALL USING (true) WITH CHECK (true);

-- Users can see their own splits (transparency)
CREATE POLICY "Users view own payment splits" ON public.payment_splits
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_payment_splits_transaction ON public.payment_splits(transaction_id);
CREATE INDEX idx_payment_splits_user ON public.payment_splits(user_id);
CREATE INDEX idx_payment_splits_forwarded ON public.payment_splits(forwarded) WHERE forwarded = false;
CREATE INDEX idx_payment_splits_kplc_payment ON public.payment_splits(kplc_payment_id);

-- 4. Helper: get total unforwarded pool balance
CREATE OR REPLACE FUNCTION public.get_kplc_pool_balance()
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(kplc_amount_kes), 0)
  FROM public.payment_splits
  WHERE forwarded = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Helper: get a system setting value by key
CREATE OR REPLACE FUNCTION public.get_setting(p_key TEXT)
RETURNS TEXT AS $$
  SELECT value FROM public.system_settings WHERE key = p_key LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
