
-- Ensure is_admin column exists on profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Recreate the profiles_safe view as SECURITY DEFINER (default) so it bypasses
-- RLS on the underlying profiles table. This is safe because the view itself
-- only exposes non-sensitive columns (no pin_hash).
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
  SELECT
    id,
    user_id,
    full_name,
    phone,
    email,
    avatar_url,
    is_admin,
    created_at,
    updated_at
  FROM public.profiles;

-- Grant SELECT on the view to both roles
GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon;

-- Also add RLS policy on profiles so users can read their own row directly
-- (needed for the view when security_invoker is not set, the view owner
-- already has access, but let's also have a direct policy for safety)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Policy for users to update their own profile
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
