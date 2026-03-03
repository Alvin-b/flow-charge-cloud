-- Add an `is_admin` flag to profiles so we can gate the admin UI

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- expose flag in the safe view used by clients (keep security_invoker)
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
SELECT
    id,
    user_id,
    full_name,
    phone,
    email,
    avatar_url,
    created_at,
    updated_at,
    is_admin
FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;
