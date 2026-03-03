
-- Fix: Make profiles_safe view use SECURITY INVOKER (not DEFINER)
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
SELECT id, user_id, full_name, phone, email, avatar_url, created_at, updated_at
FROM public.profiles;

-- Re-grant access
GRANT SELECT ON public.profiles_safe TO authenticated;
