
-- Meters table for Tuya-linked smart meters
CREATE TABLE public.meters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tuya_device_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Meter',
  property_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | linked | offline | online
  balance_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_kwh NUMERIC(10,2) NOT NULL DEFAULT 200,
  rate_kwh_hr NUMERIC(6,4) DEFAULT 0,
  sms_fallback BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meters" ON public.meters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meter link requests (tenant → meter pairing)
CREATE TABLE public.meter_link_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tuya_device_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.meter_link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own link requests" ON public.meter_link_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_kwh NUMERIC(10,2) NOT NULL DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER meters_updated_at BEFORE UPDATE ON public.meters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
