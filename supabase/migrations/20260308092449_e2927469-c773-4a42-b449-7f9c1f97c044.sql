
-- ============================================================
-- MQTT Integration Tables for COMPERE Protocol V1.9
-- ============================================================

-- 1. Real-time second-level meter readings (MQTT_RT_DATA)
CREATE TABLE IF NOT EXISTS public.mqtt_meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id text NOT NULL,
  ua numeric, ub numeric, uc numeric,
  ia numeric, ib numeric, ic numeric,
  uab numeric, ubc numeric, uca numeric,
  pa numeric, pb numeric, pc numeric,
  zyggl numeric,
  qa numeric, qb numeric, qc numeric,
  zwggl numeric,
  sa numeric, sb numeric, sc numeric,
  zszgl numeric,
  pfa numeric, pfb numeric, pfc numeric,
  zglys numeric,
  f numeric,
  u_zero_seq numeric, u_pos_seq numeric, u_neg_seq numeric,
  i_zero_seq numeric, i_pos_seq numeric, i_neg_seq numeric,
  ua_phase_angle numeric, ub_phase_angle numeric, uc_phase_angle numeric,
  ia_phase_angle numeric, ib_phase_angle numeric, ic_phase_angle numeric,
  voltage_unbalance_rate numeric, current_unbalance_rate numeric,
  active_power_demand numeric, reactive_power_demand numeric, apparent_power_demand numeric,
  residual_current numeric,
  temp_a numeric, temp_b numeric, temp_c numeric, temp_n numeric,
  reading_time timestamptz NOT NULL DEFAULT now(),
  mqtt_raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mqtt_meter_readings_meter_time ON public.mqtt_meter_readings (meter_id, reading_time DESC);
ALTER TABLE public.mqtt_meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on mqtt_meter_readings" ON public.mqtt_meter_readings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Minute-level energy readings (MQTT_ENY_NOW)
CREATE TABLE IF NOT EXISTS public.mqtt_energy_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id text NOT NULL,
  import_total_active numeric, export_total_active numeric,
  import_total_reactive numeric, export_total_reactive numeric,
  import_tariff1_active numeric, export_tariff1_active numeric,
  import_tariff2_active numeric, export_tariff2_active numeric,
  import_tariff3_active numeric, export_tariff3_active numeric,
  import_tariff4_active numeric, export_tariff4_active numeric,
  import_tariff5_active numeric, export_tariff5_active numeric,
  import_tariff6_active numeric, export_tariff6_active numeric,
  monthly_max_active_power_demand numeric,
  monthly_max_active_power_timestamp timestamptz,
  monthly_max_apparent_power_demand numeric,
  monthly_max_apparent_power_timestamp timestamptz,
  ua_thd numeric, ub_thd numeric, uc_thd numeric,
  ia_thd numeric, ib_thd numeric, ic_thd numeric,
  ua_3rd_harmonic numeric, ub_3rd_harmonic numeric, uc_3rd_harmonic numeric,
  ia_3rd_harmonic numeric, ib_3rd_harmonic numeric, ic_3rd_harmonic numeric,
  ua_5th_harmonic numeric, ub_5th_harmonic numeric, uc_5th_harmonic numeric,
  ia_5th_harmonic numeric, ib_5th_harmonic numeric, ic_5th_harmonic numeric,
  ua_7th_harmonic numeric, ub_7th_harmonic numeric, uc_7th_harmonic numeric,
  ia_7th_harmonic numeric, ib_7th_harmonic numeric, ic_7th_harmonic numeric,
  reading_time timestamptz NOT NULL DEFAULT now(),
  mqtt_raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mqtt_energy_readings_meter_time ON public.mqtt_energy_readings (meter_id, reading_time DESC);
ALTER TABLE public.mqtt_energy_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on mqtt_energy_readings" ON public.mqtt_energy_readings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Daily frozen readings (MQTT_DAY_DATA)
CREATE TABLE IF NOT EXISTS public.mqtt_daily_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id text NOT NULL,
  import_total_active numeric, export_total_active numeric,
  import_total_reactive numeric, export_total_reactive numeric,
  import_tariff1_active numeric, export_tariff1_active numeric,
  import_tariff2_active numeric, export_tariff2_active numeric,
  import_tariff3_active numeric, export_tariff3_active numeric,
  import_tariff4_active numeric, export_tariff4_active numeric,
  reading_date date NOT NULL,
  reading_time timestamptz NOT NULL DEFAULT now(),
  mqtt_raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meter_id, reading_date)
);

CREATE INDEX idx_mqtt_daily_readings_meter_date ON public.mqtt_daily_readings (meter_id, reading_date DESC);
ALTER TABLE public.mqtt_daily_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on mqtt_daily_readings" ON public.mqtt_daily_readings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Remote signal / DI-DO status (MQTT_TELEIND)
CREATE TABLE IF NOT EXISTS public.mqtt_meter_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id text NOT NULL,
  digital_inputs text,
  digital_outputs text,
  reading_time timestamptz NOT NULL DEFAULT now(),
  mqtt_raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mqtt_meter_status_meter_time ON public.mqtt_meter_status (meter_id, reading_time DESC);
ALTER TABLE public.mqtt_meter_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on mqtt_meter_status" ON public.mqtt_meter_status FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. General MQTT operations tracking (time sync, param read/set, reconfig, upload freq, recall)
CREATE TABLE IF NOT EXISTS public.mqtt_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id text NOT NULL,
  operation_id text NOT NULL,
  operation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  modbus_address text,
  parameter_length integer,
  data_type text,
  requested_value text,
  read_value text,
  command_type text,
  recall_date text,
  recall_type text,
  response_code text,
  response_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  response_received_at timestamptz,
  mqtt_raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mqtt_operations_opid ON public.mqtt_operations (operation_id);
CREATE INDEX idx_mqtt_operations_meter ON public.mqtt_operations (meter_id, status);
ALTER TABLE public.mqtt_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on mqtt_operations" ON public.mqtt_operations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Update meter_commands: add missing columns for COMPERE command tracking
ALTER TABLE public.meter_commands ADD COLUMN IF NOT EXISTS operation_id text;
ALTER TABLE public.meter_commands ADD COLUMN IF NOT EXISTS digital_output_number integer;
ALTER TABLE public.meter_commands ADD COLUMN IF NOT EXISTS digital_output_state text;
ALTER TABLE public.meter_commands ADD COLUMN IF NOT EXISTS response_code text;
ALTER TABLE public.meter_commands ADD COLUMN IF NOT EXISTS response_message text;
ALTER TABLE public.meter_commands ADD COLUMN IF NOT EXISTS responded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_meter_commands_opid ON public.meter_commands (operation_id);
