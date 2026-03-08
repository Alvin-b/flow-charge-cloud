DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true) AS
  SELECT id, user_id, full_name, phone, email, avatar_url, is_admin, created_at, updated_at
  FROM public.profiles;

REVOKE ALL ON public.profiles_safe FROM anon;
GRANT SELECT ON public.profiles_safe TO authenticated;