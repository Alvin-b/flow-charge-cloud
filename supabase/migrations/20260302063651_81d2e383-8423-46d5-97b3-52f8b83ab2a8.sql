
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Count recent transactions matching the action within the time window
  IF p_action = 'stk_push_initiate' THEN
    SELECT COUNT(*) INTO recent_count
    FROM transactions
    WHERE user_id = p_user_id
      AND type = 'recharge'
      AND status IN ('pending', 'completed')
      AND created_at > (now() - (p_window_seconds || ' seconds')::interval);
  ELSE
    -- Generic fallback
    SELECT COUNT(*) INTO recent_count
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at > (now() - (p_window_seconds || ' seconds')::interval);
  END IF;

  RETURN recent_count < p_limit;
END;
$$;
