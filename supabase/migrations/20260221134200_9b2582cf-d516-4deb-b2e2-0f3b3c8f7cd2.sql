
-- Auto-create wallet for new users on profile creation
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance_kwh, max_kwh)
  VALUES (NEW.user_id, 0, 200)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_new_user();

-- Add unique constraint on wallets.user_id if not exists
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_key;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

-- Trigger for updated_at on wallets (use IF NOT EXISTS pattern)
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger for updated_at on meters
DROP TRIGGER IF EXISTS update_meters_updated_at ON public.meters;
CREATE TRIGGER update_meters_updated_at
  BEFORE UPDATE ON public.meters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
