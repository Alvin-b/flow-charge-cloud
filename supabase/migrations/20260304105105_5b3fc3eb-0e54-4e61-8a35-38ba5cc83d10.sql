
-- Add is_admin if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Now drop and recreate view
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe AS
SELECT id, user_id, full_name, phone, email, avatar_url, is_admin, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon;

ALTER VIEW public.profiles_safe SET (security_invoker = on);

-- Create upsert_profile RPC
CREATE OR REPLACE FUNCTION public.upsert_profile(p_full_name text, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (auth.uid(), p_full_name, COALESCE(p_phone, ''), COALESCE(p_email, ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
END;
$$;

-- Create set_pin RPC
CREATE OR REPLACE FUNCTION public.set_pin(p_pin_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET pin_hash = p_pin_hash, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Ensure wallet trigger
DROP TRIGGER IF EXISTS create_wallet_on_profile ON public.profiles;
CREATE TRIGGER create_wallet_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_new_user();
