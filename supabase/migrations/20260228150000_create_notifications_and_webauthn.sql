-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'transfer', 'meter', 'low_balance', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '🔔',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications (edge functions use service role)
CREATE POLICY "Service role inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- Helper: insert a notification (callable from PL/pgSQL or edge functions)
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_icon TEXT DEFAULT '🔔',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, icon, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_icon, p_metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WebAuthn credential storage on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;
