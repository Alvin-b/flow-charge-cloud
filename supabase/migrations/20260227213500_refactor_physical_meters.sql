-- Drop Tuya-specific columns and update meters table for physical 4G meters
ALTER TABLE public.meters DROP COLUMN IF EXISTS tuya_device_id;
ALTER TABLE public.meters DROP COLUMN IF EXISTS sms_fallback;
ALTER TABLE public.meters DROP COLUMN IF EXISTS linked_at;
ALTER TABLE public.meters DROP COLUMN IF EXISTS last_sync;

-- Add physical meter specific columns
ALTER TABLE public.meters 
  ADD COLUMN IF NOT EXISTS meter_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
  ADD COLUMN IF NOT EXISTS hardware_serial TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS installed_location TEXT,
  ADD COLUMN IF NOT EXISTS installation_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_reading_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS consumption_rate_per_hour NUMERIC(6,4) DEFAULT 0; -- kWh per hour average

-- Update status column to reflect physical meter states
ALTER TABLE public.meters DROP CONSTRAINT IF EXISTS meters_status_check;
ALTER TABLE public.meters ADD CONSTRAINT meters_status_check 
  CHECK (status IN ('available', 'connected', 'offline', 'maintenance'));

-- Create meter_connections table (tracks user-meter connections)
CREATE TABLE IF NOT EXISTS public.meter_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('qr_scan', 'manual_code')),
  initial_wallet_balance NUMERIC(10,2),
  initial_meter_balance NUMERIC(10,2),
  total_consumed_kwh NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meter_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connections
CREATE POLICY "Users view own connections" ON public.meter_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create connections
CREATE POLICY "Users create connections" ON public.meter_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their connections (for disconnection)
CREATE POLICY "Users update own connections" ON public.meter_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meter_connections_user_id ON public.meter_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_meter_connections_meter_id ON public.meter_connections(meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_connections_is_active ON public.meter_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_meters_meter_code ON public.meters(meter_code);
CREATE INDEX IF NOT EXISTS idx_meters_hardware_serial ON public.meters(hardware_serial);

-- Create consumption_logs table (tracks usage over time)
CREATE TABLE IF NOT EXISTS public.consumption_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.meter_connections(id) ON DELETE SET NULL,
  kwh_consumed NUMERIC(10,2) NOT NULL CHECK (kwh_consumed > 0),
  wallet_balance_before NUMERIC(10,2) NOT NULL,
  wallet_balance_after NUMERIC(10,2) NOT NULL,
  meter_balance_before NUMERIC(10,2) NOT NULL,
  meter_balance_after NUMERIC(10,2) NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own consumption
CREATE POLICY "Users view own consumption" ON public.consumption_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert consumption logs
CREATE POLICY "Service role can insert consumption" ON public.consumption_logs
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consumption_logs_user_id ON public.consumption_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consumption_logs_meter_id ON public.consumption_logs(meter_id);
CREATE INDEX IF NOT EXISTS idx_consumption_logs_connection_id ON public.consumption_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_consumption_logs_consumed_at ON public.consumption_logs(consumed_at DESC);

-- Function to get active meter connection for a user
CREATE OR REPLACE FUNCTION public.get_active_connection(user_uuid UUID)
RETURNS TABLE (
  connection_id UUID,
  meter_id UUID,
  meter_code TEXT,
  meter_name TEXT,
  property_name TEXT,
  meter_balance NUMERIC,
  wallet_balance NUMERIC,
  connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id as connection_id,
    m.id as meter_id,
    m.meter_code,
    m.name as meter_name,
    m.property_name,
    m.balance_kwh as meter_balance,
    w.balance_kwh as wallet_balance,
    mc.connected_at
  FROM public.meter_connections mc
  JOIN public.meters m ON m.id = mc.meter_id
  JOIN public.wallets w ON w.user_id = mc.user_id
  WHERE mc.user_id = user_uuid 
    AND mc.is_active = true
    AND mc.disconnected_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disconnect from meter (for user)
CREATE OR REPLACE FUNCTION public.disconnect_from_meter(connection_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get user_id from connection
  SELECT user_id INTO user_uuid 
  FROM public.meter_connections 
  WHERE id = connection_uuid AND auth.uid() = user_id;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Connection not found or unauthorized';
  END IF;
  
  -- Update connection
  UPDATE public.meter_connections
  SET 
    is_active = false,
    disconnected_at = now()
  WHERE id = connection_uuid;
  
  -- Update meter status to available
  UPDATE public.meters
  SET status = 'available'
  WHERE id = (SELECT meter_id FROM public.meter_connections WHERE id = connection_uuid);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update meter status when connection is created
CREATE OR REPLACE FUNCTION public.update_meter_status_on_connection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.meters
    SET status = 'connected'
    WHERE id = NEW.meter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_meter_connection_created ON public.meter_connections;
CREATE TRIGGER on_meter_connection_created
  AFTER INSERT ON public.meter_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meter_status_on_connection();

-- Admin-only table for managing meters (admin portal will use this)
CREATE TABLE IF NOT EXISTS public.admin_meters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meter_id UUID NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  registered_by UUID, -- admin user ID
  registration_notes TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comment on tables
COMMENT ON TABLE public.meter_connections IS 'Tracks which user is connected to which meter';
COMMENT ON TABLE public.consumption_logs IS 'Historical record of energy consumption';
COMMENT ON TABLE public.admin_meters IS 'Admin portal meter registration records';
