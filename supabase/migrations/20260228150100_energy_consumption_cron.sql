-- process_energy_consumption(): runs periodically to deduct wallet balance
-- for all active meter connections based on meter consumption rate.
CREATE OR REPLACE FUNCTION public.process_energy_consumption()
RETURNS TABLE(connections_processed INT, total_kwh_consumed NUMERIC) AS $$
DECLARE
  conn RECORD;
  elapsed_hours NUMERIC;
  kwh_to_consume NUMERIC;
  current_balance NUMERIC;
  actual_consumed NUMERIC;
  processed INT := 0;
  total_consumed NUMERIC := 0;
  last_log_time TIMESTAMPTZ;
BEGIN
  FOR conn IN
    SELECT
      mc.id AS connection_id,
      mc.user_id,
      mc.meter_id,
      mc.connected_at,
      m.consumption_rate_per_hour,
      m.name AS meter_name
    FROM public.meter_connections mc
    JOIN public.meters m ON m.id = mc.meter_id
    WHERE mc.is_active = true
      AND mc.disconnected_at IS NULL
      AND m.consumption_rate_per_hour > 0
  LOOP
    -- Find the last consumption log for this connection (or use connected_at)
    SELECT MAX(consumed_at) INTO last_log_time
    FROM public.consumption_logs
    WHERE connection_id = conn.connection_id;

    IF last_log_time IS NULL THEN
      last_log_time := conn.connected_at;
    END IF;

    -- Calculate elapsed hours since last consumption
    elapsed_hours := EXTRACT(EPOCH FROM (now() - last_log_time)) / 3600.0;

    -- Skip if less than 1 minute elapsed (avoid micro-deductions)
    IF elapsed_hours < (1.0 / 60.0) THEN
      CONTINUE;
    END IF;

    -- Calculate kWh to consume
    kwh_to_consume := ROUND((conn.consumption_rate_per_hour * elapsed_hours)::numeric, 4);

    IF kwh_to_consume <= 0 THEN
      CONTINUE;
    END IF;

    -- Get current wallet balance
    SELECT balance_kwh INTO current_balance
    FROM public.wallets
    WHERE user_id = conn.user_id
    FOR UPDATE; -- Lock row for atomic update

    IF current_balance IS NULL OR current_balance <= 0 THEN
      -- No balance: insert low_balance notification (max once per day)
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = conn.user_id
          AND type = 'low_balance'
          AND created_at > now() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.insert_notification(
          conn.user_id,
          'low_balance',
          'Wallet Empty',
          'Your wallet balance is 0 kWh. Recharge to continue using ' || conn.meter_name || '.',
          '🔴'
        );
      END IF;
      CONTINUE;
    END IF;

    -- Clamp to available balance
    actual_consumed := LEAST(kwh_to_consume, current_balance);

    -- Deduct from wallet
    UPDATE public.wallets
    SET balance_kwh = balance_kwh - actual_consumed
    WHERE user_id = conn.user_id;

    -- Update meter connection total
    UPDATE public.meter_connections
    SET total_consumed_kwh = COALESCE(total_consumed_kwh, 0) + actual_consumed
    WHERE id = conn.connection_id;

    -- Get balances for log
    INSERT INTO public.consumption_logs (
      user_id, meter_id, connection_id, kwh_consumed,
      wallet_balance_before, wallet_balance_after,
      meter_balance_before, meter_balance_after,
      consumed_at
    ) VALUES (
      conn.user_id, conn.meter_id, conn.connection_id, actual_consumed,
      current_balance, current_balance - actual_consumed,
      0, 0, -- meter_balance not tracked separately in cloud model
      now()
    );

    processed := processed + 1;
    total_consumed := total_consumed + actual_consumed;

    -- Low balance alert at 5 kWh threshold (max once per day)
    IF (current_balance - actual_consumed) > 0
       AND (current_balance - actual_consumed) <= 5
       AND current_balance > 5
    THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = conn.user_id
          AND type = 'low_balance'
          AND created_at > now() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.insert_notification(
          conn.user_id,
          'low_balance',
          'Low Balance Alert',
          'Your wallet balance is below 5 kWh (' || ROUND((current_balance - actual_consumed)::numeric, 1) || ' kWh remaining). Recharge soon!',
          '🟡'
        );
      END IF;
    END IF;
  END LOOP;

  connections_processed := processed;
  total_kwh_consumed := total_consumed;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension (Supabase has this available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule consumption processing every 5 minutes
SELECT cron.schedule(
  'process-energy-consumption',
  '*/5 * * * *',
  $$SELECT * FROM public.process_energy_consumption()$$
);
