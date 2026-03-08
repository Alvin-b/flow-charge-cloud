
-- ═══════════════════════════════════════════════════════════
-- 1. system_settings: admin-configurable key-value store
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only service-role can write; authenticated can read
CREATE POLICY "Authenticated users can read settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- 2. payment_splits: tracks commission/KPLC split per recharge
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL,
  original_amount_kes NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 10,
  commission_amount_kes NUMERIC NOT NULL DEFAULT 0,
  kplc_amount_kes NUMERIC NOT NULL DEFAULT 0,
  forwarded BOOLEAN NOT NULL DEFAULT false,
  kplc_payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own splits"
  ON public.payment_splits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 3. kplc_payments: tracks B2B payments sent to KPLC
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.kplc_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_kes NUMERIC NOT NULL,
  paybill TEXT NOT NULL DEFAULT '888880',
  account_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mpesa_conversation_id TEXT,
  mpesa_originator_conversation_id TEXT,
  mpesa_receipt TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.kplc_payments ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS — only service-role accesses this table

-- ═══════════════════════════════════════════════════════════
-- 4. meter_connections: tracks active user-to-meter connections
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.meter_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.meter_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meter connections"
  ON public.meter_connections FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 5. meter_transfers: wallet-to-meter transfer audit trail
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.meter_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.meter_connections(id),
  amount_kwh NUMERIC NOT NULL,
  wallet_balance_before NUMERIC NOT NULL DEFAULT 0,
  wallet_balance_after NUMERIC NOT NULL DEFAULT 0,
  meter_balance_before NUMERIC NOT NULL DEFAULT 0,
  meter_balance_after NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meter_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meter transfers"
  ON public.meter_transfers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 6. consumption_logs: historical energy consumption per meter
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.consumption_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.meter_connections(id),
  kwh_used NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consumption"
  ON public.consumption_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 7. meter_readings: telemetry data from IoT/MQTT
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  voltage NUMERIC,
  current_amps NUMERIC,
  power_watts NUMERIC,
  energy_kwh NUMERIC,
  frequency_hz NUMERIC,
  power_factor NUMERIC,
  raw_payload JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

-- Users can read readings for their own meters
CREATE POLICY "Users view own meter readings"
  ON public.meter_readings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meters
      WHERE meters.id = meter_readings.meter_id
        AND meters.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- 8. meter_commands: MQTT command tracking
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.meter_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  command_type TEXT NOT NULL,
  oprid TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.meter_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meter commands"
  ON public.meter_commands FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 9. user_roles: proper role-based access (replaces is_admin)
-- ═══════════════════════════════════════════════════════════
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ═══════════════════════════════════════════════════════════
-- 10. Wallet auto-provisioning trigger
-- ═══════════════════════════════════════════════════════════
CREATE TRIGGER trg_create_wallet_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_new_user();

-- ═══════════════════════════════════════════════════════════
-- 11. Meter connection trigger: set meter status on connect
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.on_meter_connection_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.meters SET status = 'connected' WHERE id = NEW.meter_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meter_connected
  AFTER INSERT ON public.meter_connections
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.on_meter_connection_insert();

-- ═══════════════════════════════════════════════════════════
-- 12. Disconnect RPC
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.disconnect_from_meter(p_connection_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meter_id UUID;
BEGIN
  UPDATE public.meter_connections
  SET is_active = false, disconnected_at = now()
  WHERE id = p_connection_id AND user_id = auth.uid() AND is_active = true
  RETURNING meter_id INTO v_meter_id;

  IF v_meter_id IS NOT NULL THEN
    UPDATE public.meters SET status = 'available' WHERE id = v_meter_id;
  END IF;
END;
$$;
