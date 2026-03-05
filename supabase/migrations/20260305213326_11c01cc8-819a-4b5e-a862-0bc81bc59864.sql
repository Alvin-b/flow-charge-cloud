
-- Grant column-level SELECT on safe columns so RLS USING clauses work for UPDATE
-- while keeping pin_hash hidden from direct SELECT
GRANT SELECT (id, user_id, full_name, phone, email, avatar_url, created_at, updated_at, is_admin) 
  ON public.profiles TO authenticated;
