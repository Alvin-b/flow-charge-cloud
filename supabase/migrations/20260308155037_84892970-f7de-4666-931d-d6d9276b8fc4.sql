
-- Add mqtt_meter_id column to link meters table with MQTT device IDs
ALTER TABLE public.meters ADD COLUMN IF NOT EXISTS mqtt_meter_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_meters_mqtt_meter_id ON public.meters(mqtt_meter_id);

-- Track last known energy reading for delta calculation
ALTER TABLE public.meters ADD COLUMN IF NOT EXISTS last_energy_kwh NUMERIC DEFAULT 0;
ALTER TABLE public.meters ADD COLUMN IF NOT EXISTS is_relay_on BOOLEAN DEFAULT true;

-- Create function to process energy consumption and debit wallet
CREATE OR REPLACE FUNCTION public.process_energy_consumption(
  p_mqtt_meter_id TEXT,
  p_current_energy_kwh NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meter RECORD;
  v_connection RECORD;
  v_delta_kwh NUMERIC;
  v_new_balance NUMERIC;
  v_wallet RECORD;
BEGIN
  -- Find meter by MQTT ID
  SELECT * INTO v_meter FROM meters WHERE mqtt_meter_id = p_mqtt_meter_id;
  IF v_meter IS NULL THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'meter_not_found');
  END IF;

  -- Find active connection
  SELECT * INTO v_connection FROM meter_connections
    WHERE meter_id = v_meter.id AND is_active = true
    LIMIT 1;
  IF v_connection IS NULL THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'no_active_connection');
  END IF;

  -- Calculate delta (skip if first reading or meter reset)
  v_delta_kwh := p_current_energy_kwh - v_meter.last_energy_kwh;
  IF v_meter.last_energy_kwh = 0 OR v_delta_kwh <= 0 OR v_delta_kwh > 100 THEN
    -- First reading or meter reset or unreasonable delta — just update baseline
    UPDATE meters SET last_energy_kwh = p_current_energy_kwh, last_sync = now() WHERE id = v_meter.id;
    RETURN jsonb_build_object('action', 'baseline_set', 'energy_kwh', p_current_energy_kwh);
  END IF;

  -- Update meter baseline
  UPDATE meters SET last_energy_kwh = p_current_energy_kwh, last_sync = now() WHERE id = v_meter.id;

  -- Debit wallet
  BEGIN
    SELECT public.debit_wallet(v_connection.user_id, v_delta_kwh) INTO v_new_balance;
  EXCEPTION WHEN OTHERS THEN
    -- Insufficient balance — return cutoff signal
    SELECT balance_kwh INTO v_new_balance FROM wallets WHERE user_id = v_connection.user_id;
    
    -- Log the consumption anyway
    INSERT INTO consumption_logs (user_id, meter_id, connection_id, kwh_used, period_start, period_end)
    VALUES (v_connection.user_id, v_meter.id, v_connection.id, v_delta_kwh, now() - interval '1 minute', now());
    
    -- Mark relay as off
    UPDATE meters SET is_relay_on = false WHERE id = v_meter.id;
    
    RETURN jsonb_build_object(
      'action', 'cutoff',
      'user_id', v_connection.user_id,
      'meter_id', v_meter.id,
      'mqtt_meter_id', p_mqtt_meter_id,
      'delta_kwh', v_delta_kwh,
      'balance_kwh', COALESCE(v_new_balance, 0)
    );
  END;

  -- Log consumption
  INSERT INTO consumption_logs (user_id, meter_id, connection_id, kwh_used, period_start, period_end)
  VALUES (v_connection.user_id, v_meter.id, v_connection.id, v_delta_kwh, now() - interval '1 minute', now());

  -- Check if balance is critically low (below 1 kWh)
  IF v_new_balance <= 0 THEN
    UPDATE meters SET is_relay_on = false WHERE id = v_meter.id;
    RETURN jsonb_build_object(
      'action', 'cutoff',
      'user_id', v_connection.user_id,
      'meter_id', v_meter.id,
      'mqtt_meter_id', p_mqtt_meter_id,
      'delta_kwh', v_delta_kwh,
      'balance_kwh', v_new_balance
    );
  END IF;

  RETURN jsonb_build_object(
    'action', 'debited',
    'user_id', v_connection.user_id,
    'delta_kwh', v_delta_kwh,
    'balance_kwh', v_new_balance
  );
END;
$$;

-- Create auto-reconnect function for after recharge
CREATE OR REPLACE FUNCTION public.auto_reconnect_on_recharge(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_connection RECORD;
  v_meter RECORD;
  v_wallet RECORD;
BEGIN
  -- Check wallet has balance
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
  IF v_wallet IS NULL OR v_wallet.balance_kwh <= 0 THEN
    RETURN jsonb_build_object('reconnected', false, 'reason', 'no_balance');
  END IF;

  -- Find active connection where relay is off
  SELECT mc.*, m.mqtt_meter_id, m.name as meter_name, m.is_relay_on
  INTO v_connection
  FROM meter_connections mc
  JOIN meters m ON m.id = mc.meter_id
  WHERE mc.user_id = p_user_id AND mc.is_active = true AND m.is_relay_on = false
  LIMIT 1;

  IF v_connection IS NULL THEN
    RETURN jsonb_build_object('reconnected', false, 'reason', 'no_disconnected_meter');
  END IF;

  -- Mark relay as on
  UPDATE meters SET is_relay_on = true WHERE mqtt_meter_id = v_connection.mqtt_meter_id;

  RETURN jsonb_build_object(
    'reconnected', true,
    'mqtt_meter_id', v_connection.mqtt_meter_id,
    'meter_name', v_connection.meter_name,
    'meter_code', v_connection.mqtt_meter_id
  );
END;
$$;
