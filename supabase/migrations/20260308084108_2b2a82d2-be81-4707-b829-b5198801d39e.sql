-- Create rate_limit_events table and rewrite check_rate_limit

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limit_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON public.rate_limit_events (user_id, action, created_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '1 hour';
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_action text, p_limit integer, p_window_seconds integer)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  INSERT INTO public.rate_limit_events (user_id, action) VALUES (p_user_id, p_action);
  
  IF random() < 0.01 THEN
    PERFORM public.cleanup_rate_limit_events();
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.rate_limit_events
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > (now() - (p_window_seconds || ' seconds')::interval);

  RETURN recent_count <= p_limit;
END;
$$;