
CREATE OR REPLACE FUNCTION public.reset_pin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET pin_hash = NULL, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;
