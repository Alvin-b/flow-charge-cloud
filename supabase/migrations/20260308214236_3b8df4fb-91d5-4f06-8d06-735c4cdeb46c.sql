
-- Meter registry: admin pre-registers known meter MNs (bulk scanner)
CREATE TABLE public.meter_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mqtt_meter_id TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT 'COMPERE DDS666',
  property_name TEXT,
  registered_by UUID REFERENCES auth.users(id),
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_by UUID REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- RLS
ALTER TABLE public.meter_registry ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read registry to check if their meter is registered
CREATE POLICY "Authenticated users can check registry"
  ON public.meter_registry FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (admin API uses service role)
-- Default deny handles this - no INSERT/UPDATE/DELETE policies for authenticated
