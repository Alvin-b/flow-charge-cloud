-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create mqtt_meter_readings table (second-level real-time data)
create table mqtt_meter_readings (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Voltage readings
  ua numeric(10, 2),
  ub numeric(10, 2),
  uc numeric(10, 2),
  uab numeric(10, 2),
  ubc numeric(10, 2),
  uca numeric(10, 2),
  
  -- Current readings
  ia numeric(10, 2),
  ib numeric(10, 2),
  ic numeric(10, 2),
  
  -- Power readings
  pa numeric(10, 2),
  pb numeric(10, 2),
  pc numeric(10, 2),
  zyggl numeric(10, 2), -- Total active power
  
  -- Reactive power
  qa numeric(10, 2),
  qb numeric(10, 2),
  qc numeric(10, 2),
  zwggl numeric(10, 2), -- Total reactive power
  
  -- Apparent power
  sa numeric(10, 2),
  sb numeric(10, 2),
  sc numeric(10, 2),
  zszgl numeric(10, 2), -- Total apparent power
  
  -- Power factors
  pfa numeric(10, 3),
  pfb numeric(10, 3),
  pfc numeric(10, 3),
  zglys numeric(10, 3), -- Total power factor
  
  -- Frequency
  f numeric(10, 2), -- Hz
  
  -- Sequence components
  u_zero_seq numeric(10, 2),
  u_pos_seq numeric(10, 2),
  u_neg_seq numeric(10, 2),
  i_zero_seq numeric(10, 2),
  i_pos_seq numeric(10, 2),
  i_neg_seq numeric(10, 2),
  
  -- Phase angles
  ua_phase_angle numeric(10, 2),
  ub_phase_angle numeric(10, 2),
  uc_phase_angle numeric(10, 2),
  ia_phase_angle numeric(10, 2),
  ib_phase_angle numeric(10, 2),
  ic_phase_angle numeric(10, 2),
  
  -- Unbalance rates
  voltage_unbalance_rate numeric(10, 3),
  current_unbalance_rate numeric(10, 3),
  
  -- Demand
  active_power_demand numeric(10, 2),
  reactive_power_demand numeric(10, 2),
  apparent_power_demand numeric(10, 2),
  
  -- Other
  residual_current numeric(10, 2),
  temp_a numeric(10, 2),
  temp_b numeric(10, 2),
  temp_c numeric(10, 2),
  temp_n numeric(10, 2),
  
  -- Metadata
  reading_time timestamp with time zone not null,
  received_at timestamp with time zone default now(),
  mqtt_raw_payload jsonb,
  
  created_at timestamp with time zone default now()
);

-- Create mqtt_energy_readings table (minute-level energy data)
create table mqtt_energy_readings (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Total energy
  import_total_active numeric(20, 3), -- kWh
  export_total_active numeric(20, 3),
  import_total_reactive numeric(20, 3), -- kvarh
  export_total_reactive numeric(20, 3),
  
  -- Tariff 1-6 (active)
  import_tariff1_active numeric(20, 3),
  export_tariff1_active numeric(20, 3),
  import_tariff2_active numeric(20, 3),
  export_tariff2_active numeric(20, 3),
  import_tariff3_active numeric(20, 3),
  export_tariff3_active numeric(20, 3),
  import_tariff4_active numeric(20, 3),
  export_tariff4_active numeric(20, 3),
  import_tariff5_active numeric(20, 3),
  export_tariff5_active numeric(20, 3),
  import_tariff6_active numeric(20, 3),
  export_tariff6_active numeric(20, 3),
  
  -- Power demand
  monthly_max_active_power_demand numeric(10, 2),
  monthly_max_active_power_timestamp timestamp with time zone,
  monthly_max_apparent_power_demand numeric(10, 2),
  monthly_max_apparent_power_timestamp timestamp with time zone,
  
  -- Harmonics (THD)
  ua_thd numeric(10, 3),
  ub_thd numeric(10, 3),
  uc_thd numeric(10, 3),
  ia_thd numeric(10, 3),
  ib_thd numeric(10, 3),
  ic_thd numeric(10, 3),
  
  -- 3rd, 5th, 7th Harmonics (voltage)
  ua_3rd_harmonic numeric(10, 3),
  ub_3rd_harmonic numeric(10, 3),
  uc_3rd_harmonic numeric(10, 3),
  ua_5th_harmonic numeric(10, 3),
  ub_5th_harmonic numeric(10, 3),
  uc_5th_harmonic numeric(10, 3),
  ua_7th_harmonic numeric(10, 3),
  ub_7th_harmonic numeric(10, 3),
  uc_7th_harmonic numeric(10, 3),
  
  -- Harmonics (current)
  ia_3rd_harmonic numeric(10, 3),
  ib_3rd_harmonic numeric(10, 3),
  ic_3rd_harmonic numeric(10, 3),
  ia_5th_harmonic numeric(10, 3),
  ib_5th_harmonic numeric(10, 3),
  ic_5th_harmonic numeric(10, 3),
  ia_7th_harmonic numeric(10, 3),
  ib_7th_harmonic numeric(10, 3),
  ic_7th_harmonic numeric(10, 3),
  
  -- Metadata
  reading_time timestamp with time zone not null,
  received_at timestamp with time zone default now(),
  mqtt_raw_payload jsonb,
  
  created_at timestamp with time zone default now()
);

-- Create mqtt_daily_readings table (daily frozen data)
create table mqtt_daily_readings (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Daily snapshot at 0:00
  import_total_active numeric(20, 3),
  export_total_active numeric(20, 3),
  import_total_reactive numeric(20, 3),
  export_total_reactive numeric(20, 3),
  
  -- Tariffs at daily reset
  import_tariff1_active numeric(20, 3),
  export_tariff1_active numeric(20, 3),
  import_tariff2_active numeric(20, 3),
  export_tariff2_active numeric(20, 3),
  import_tariff3_active numeric(20, 3),
  export_tariff3_active numeric(20, 3),
  import_tariff4_active numeric(20, 3),
  export_tariff4_active numeric(20, 3),
  
  -- Daily date
  reading_date date not null,
  reading_time timestamp with time zone not null, -- 00:00 on reading_date
  received_at timestamp with time zone default now(),
  
  mqtt_raw_payload jsonb,
  created_at timestamp with time zone default now(),
  
  constraint mqtt_daily_readings_unique_meter_date unique(meter_id, reading_date)
);

-- Create mqtt_meter_status table (DI/DO states)
create table mqtt_meter_status (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Digital Inputs/Outputs
  digital_inputs text, -- Binary string (e.g., "00000003")
  digital_outputs text, -- Binary string (e.g., "00000003")
  
  -- Timestamp from meter
  reading_time timestamp with time zone not null,
  received_at timestamp with time zone default now(),
  
  mqtt_raw_payload jsonb,
  created_at timestamp with time zone default now()
);

-- Create mqtt_commands table (remote control commands)
create table mqtt_commands (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Command info
  operation_id text not null unique, -- 32-bit operation ID
  command_type text not null, -- 'remote_control', 'time_sync', 'parameter_set', etc.
  
  -- For remote control
  digital_output_number integer, -- 1-32
  digital_output_state text, -- "0" or "1"
  
  -- Status
  status text not null default 'pending', -- pending, sent, acknowledged, failed
  response_code text, -- "01" = success, "02" = failure
  response_message text,
  
  -- Timestamps
  sent_at timestamp with time zone,
  responded_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  
  mqtt_raw_payload jsonb
);

-- Create mqtt_operations table (generic operations like parameter read/write)
create table mqtt_operations (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Operation info
  operation_id text not null unique,
  operation_type text not null, -- 'parameter_set', 'parameter_read', 'time_sync', 'reconfig', 'upload_freq_set', 'data_recall'
  
  -- For parameter operations
  modbus_address text, -- Hex register address
  parameter_length integer,
  data_type text, -- "1" (integer) or "2" (float)
  requested_value text,
  read_value text,
  
  -- For upload frequency
  command_type text, -- "0000" (second-level) or "0001" (minute-level)
  
  -- For data recall
  recall_date text, -- yyyyMM or yyyyMMdd
  recall_type text, -- "2" for monthly
  
  -- Status
  status text not null default 'pending', -- pending, sent, acknowledged, failed, completed
  response_code text, -- "01" = success, "02" = failure
  response_message text,
  
  -- Timestamps
  requested_at timestamp with time zone default now(),
  sent_at timestamp with time zone,
  response_received_at timestamp with time zone,
  
  mqtt_raw_payload jsonb
);

-- Create mqtt_configuration table (meter MQTT config)
create table mqtt_configuration (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  
  -- Network config
  mqtt_broker_ip text,
  mqtt_broker_port integer,
  mqtt_username text,
  mqtt_password_encrypted text, -- Encrypted
  
  -- WiFi config (if applicable)
  wifi_ssid text,
  wifi_password_encrypted text,
  wifi_security_type text, -- TLS, PEAP, TTLS, etc.
  wifi_username2 text,
  wifi_password2_encrypted text,
  
  -- Cellular config (if 4G)
  cellular_enabled boolean default false,
  
  -- Upload frequencies (valid values from spec)
  second_level_upload_frequency integer, -- seconds: 30, 60, 300, 600, 900, 1200, 1800, 3600
  minute_level_upload_frequency integer, -- minutes: 1, 5, 10, 15, 20, 30, 60, 1440
  
  -- Timestamps
  configured_at timestamp with time zone default now(),
  synchronized_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Create indexes for common queries
create index mqtt_readings_meter_time on mqtt_meter_readings(meter_id, reading_time desc);
create index mqtt_readings_received on mqtt_meter_readings(received_at desc);
create index mqtt_energy_readings_meter_time on mqtt_energy_readings(meter_id, reading_time desc);
create index mqtt_energy_readings_received on mqtt_energy_readings(received_at desc);
create index mqtt_daily_readings_meter_date on mqtt_daily_readings(meter_id, reading_date desc);
create index mqtt_commands_meter_status on mqtt_commands(meter_id, status);
create index mqtt_commands_operation on mqtt_commands(operation_id);
create index mqtt_operations_meter_status on mqtt_operations(meter_id, status);
create index mqtt_operations_id on mqtt_operations(operation_id);
create index mqtt_meter_status_meter on mqtt_meter_status(meter_id);
create index mqtt_meter_status_time on mqtt_meter_status(meter_id, reading_time desc);

-- Create function to auto-update updated_at
create or replace function update_mqtt_configuration_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger mqtt_configuration_update_timestamp
before update on mqtt_configuration
for each row
execute function update_mqtt_configuration_timestamp();

-- Enable RLS
alter table mqtt_meter_readings enable row level security;
alter table mqtt_energy_readings enable row level security;
alter table mqtt_daily_readings enable row level security;
alter table mqtt_meter_status enable row level security;
alter table mqtt_commands enable row level security;
alter table mqtt_operations enable row level security;
alter table mqtt_configuration enable row level security;

-- RLS Policies: Users can only see their own meters' MQTT data
create policy "Users can view their own meter readings"
  on mqtt_meter_readings for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can view their own energy readings"
  on mqtt_energy_readings for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can view their own daily readings"
  on mqtt_daily_readings for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can view their own meter status"
  on mqtt_meter_status for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can view their own commands"
  on mqtt_commands for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can create their own commands"
  on mqtt_commands for insert
  with check (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can view their own operations"
  on mqtt_operations for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

create policy "Users can view their own configuration"
  on mqtt_configuration for select
  using (
    meter_id in (
      select id from meters where user_id = auth.uid()
    )
  );

-- Service role can insert MQTT data (from webhook)
create policy "Service role can insert meter readings"
  on mqtt_meter_readings for insert
  with check (true);

create policy "Service role can insert energy readings"
  on mqtt_energy_readings for insert
  with check (true);

create policy "Service role can insert daily readings"
  on mqtt_daily_readings for insert
  with check (true);

create policy "Service role can insert meter status"
  on mqtt_meter_status for insert
  with check (true);

create policy "Service role can update commands"
  on mqtt_commands for update
  with check (true);

create policy "Service role can update operations"
  on mqtt_operations for update
  with check (true);
