
-- ===========================================
-- FIX 1: Protect pin_hash from direct SELECT
-- ===========================================

-- Create a safe view that excludes pin_hash
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT id, user_id, full_name, phone, email, avatar_url, created_at, updated_at
FROM public.profiles;

-- Grant authenticated users access to the safe view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Revoke direct SELECT on profiles from authenticated users
-- (SECURITY DEFINER functions like verify_pin/has_pin still work)
REVOKE SELECT ON public.profiles FROM authenticated;

-- ===========================================
-- FIX 2: meter_transfers immutability policies
-- ===========================================

-- Add explicit deny policies for UPDATE/DELETE on meter_transfers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meter_transfers') THEN
    -- Deny UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meter_transfers' AND policyname = 'meter_transfers are immutable') THEN
      EXECUTE 'CREATE POLICY "meter_transfers are immutable" ON public.meter_transfers FOR UPDATE USING (false)';
    END IF;
    -- Deny DELETE  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meter_transfers' AND policyname = 'meter_transfers cannot be deleted') THEN
      EXECUTE 'CREATE POLICY "meter_transfers cannot be deleted" ON public.meter_transfers FOR DELETE USING (false)';
    END IF;
    -- Add documentation comment
    COMMENT ON TABLE public.meter_transfers IS 'Immutable audit log of wallet-to-meter energy transfers.';
  END IF;
END $$;
