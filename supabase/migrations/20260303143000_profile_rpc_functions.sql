-- Add helper functions for client-safe profile writes

-- upsert_profile: insert or update the authenticated user's profile without
-- requiring direct SELECT access to the profiles table (avoids RLS/permission
-- errors during upsert conflicts).
CREATE OR REPLACE FUNCTION public.upsert_profile(
    p_full_name text,
    p_phone text,
    p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles(user_id, full_name, phone, email)
    VALUES (auth.uid(), p_full_name, p_phone, p_email)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        updated_at = now();
END;
$$;

-- set_pin: set or overwrite the authenticated user's PIN hash.
CREATE OR REPLACE FUNCTION public.set_pin(
    p_pin_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles(user_id, pin_hash)
    VALUES (auth.uid(), p_pin_hash)
    ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = p_pin_hash,
        updated_at = now();
END;
$$;
