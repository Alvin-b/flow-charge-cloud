-- Auto-reconnect a user to their most recent meter after wallet recharge.
-- Returns a JSON object with reconnection status and meter details.
-- This runs as SECURITY DEFINER so edge functions (service role) can call it.

CREATE OR REPLACE FUNCTION public.auto_reconnect_on_recharge(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_conn RECORD;
  v_meter RECORD;
  v_active RECORD;
  v_wallet RECORD;
  v_new_conn_id UUID;
BEGIN
  -- 1. Check if user already has an active connection (no reconnect needed)
  SELECT id INTO v_active
  FROM public.meter_connections
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF v_active IS NOT NULL THEN
    RETURN jsonb_build_object('reconnected', false, 'reason', 'already_connected');
  END IF;

  -- 2. Find the user's most recently disconnected connection
  SELECT mc.id, mc.meter_id, mc.disconnected_at
  INTO v_last_conn
  FROM public.meter_connections mc
  WHERE mc.user_id = p_user_id
    AND mc.is_active = false
    AND mc.disconnected_at IS NOT NULL
  ORDER BY mc.disconnected_at DESC
  LIMIT 1;

  IF v_last_conn IS NULL THEN
    RETURN jsonb_build_object('reconnected', false, 'reason', 'no_previous_connection');
  END IF;

  -- 3. Check if that meter is available
  SELECT id, name, meter_code, property_name, balance_kwh, status
  INTO v_meter
  FROM public.meters
  WHERE id = v_last_conn.meter_id AND status = 'available';

  IF v_meter IS NULL THEN
    RETURN jsonb_build_object('reconnected', false, 'reason', 'meter_unavailable');
  END IF;

  -- 4. Get wallet balance
  SELECT balance_kwh INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id;

  -- 5. Create new connection (the on_meter_connection_created trigger will set meter status to 'connected')
  INSERT INTO public.meter_connections (
    user_id, meter_id, connection_type, is_active,
    initial_wallet_balance, initial_meter_balance
  ) VALUES (
    p_user_id, v_last_conn.meter_id, 'auto_reconnect', true,
    COALESCE(v_wallet.balance_kwh, 0), v_meter.balance_kwh
  )
  RETURNING id INTO v_new_conn_id;

  RETURN jsonb_build_object(
    'reconnected', true,
    'connection_id', v_new_conn_id,
    'meter_id', v_meter.id,
    'meter_name', v_meter.name,
    'meter_code', v_meter.meter_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also allow 'auto_reconnect' as a connection_type
ALTER TABLE public.meter_connections DROP CONSTRAINT IF EXISTS meter_connections_connection_type_check;
ALTER TABLE public.meter_connections ADD CONSTRAINT meter_connections_connection_type_check
  CHECK (connection_type IN ('qr_scan', 'manual_code', 'auto_reconnect'));
