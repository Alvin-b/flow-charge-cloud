-- Security Hardening: Rate Limiting & Audit Logs

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN (
    'login', 'logout', 'pin_change', 'biometric_register', 
    'meter_connect', 'meter_disconnect', 'wallet_recharge', 
    'p2p_transfer', 'admin_action', 'security_event'
  )),
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient audit log queries
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action, created_at DESC);

-- RLS for audit logs (only admins can read)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Admin users can read all audit logs (you'd need an admin role system)
-- For now, only service role can read
CREATE POLICY "Service role can read audit logs" ON public.audit_logs
  FOR SELECT USING (false); -- No one can read directly; use edge functions

-- Rate limiting helper function
-- Tracks request counts per user/action in a time window
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS BOOLEAN AS $$
DECLARE
  request_count INT;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*) INTO request_count
  FROM public.audit_logs
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Return true if within limit, false if exceeded
  RETURN request_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to log audit events
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced PIN hashing check (already using bcrypt-style in frontend, this is backup)
-- Add column for failed PIN attempts tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_pin_attempts INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

-- Function to increment failed PIN attempts
CREATE OR REPLACE FUNCTION public.record_failed_pin(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET failed_pin_attempts = failed_pin_attempts + 1,
      pin_locked_until = CASE 
        WHEN failed_pin_attempts >= 4 THEN now() + INTERVAL '15 minutes'
        ELSE pin_locked_until
      END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset PIN attempts on successful unlock
CREATE OR REPLACE FUNCTION public.reset_pin_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET failed_pin_attempts = 0,
      pin_locked_until = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate phone number format (254 prefix, 12 digits)
CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone ~ '^254[0-9]{9}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint for phone validation on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_format'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_format CHECK (validate_phone(phone));
  END IF;
END $$;

-- Prevent negative wallet balances
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative 
  CHECK (balance_kwh >= 0);

-- Prevent meter transfers with zero or negative amounts
ALTER TABLE public.consumption_logs ADD CONSTRAINT consumption_logs_positive_kwh 
  CHECK (kwh_consumed >= 0);

-- Add updated_at trigger function for all tables
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to key tables (add column if missing)
DO $$
BEGIN
  -- Add updated_at columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'updated_at') THEN
    ALTER TABLE public.wallets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meters' AND column_name = 'updated_at') THEN
    ALTER TABLE public.meters ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_meters_updated_at ON public.meters;
CREATE TRIGGER update_meters_updated_at
  BEFORE UPDATE ON public.meters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add index to transactions for efficient querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
  ON public.transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type_status 
  ON public.transactions(type, status);

-- Add index to consumption_logs for analytics queries
CREATE INDEX IF NOT EXISTS idx_consumption_logs_user_time 
  ON public.consumption_logs(user_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS idx_consumption_logs_connection 
  ON public.consumption_logs(connection_id, consumed_at DESC);

-- Comment documentation
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for sensitive operations';
COMMENT ON FUNCTION public.check_rate_limit IS 'Rate limiting: checks if user exceeded action limit in time window';
COMMENT ON FUNCTION public.log_audit IS 'Creates audit log entry for tracking security events';
COMMENT ON FUNCTION public.record_failed_pin IS 'Increments failed PIN attempts and locks account after 5 failures';
COMMENT ON FUNCTION public.reset_pin_attempts IS 'Resets failed PIN counter after successful authentication';
