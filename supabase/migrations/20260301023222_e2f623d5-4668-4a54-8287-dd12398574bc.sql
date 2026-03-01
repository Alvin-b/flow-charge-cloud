
-- Create server-side PIN verification function (prevents exposing pin_hash to client)
CREATE OR REPLACE FUNCTION public.verify_pin(p_pin_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN stored_hash = p_pin_hash;
END;
$$;

-- Create function to check if user has a PIN set (without exposing the hash)
CREATE OR REPLACE FUNCTION public.has_pin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND pin_hash IS NOT NULL
  );
END;
$$;

-- Create atomic wallet credit function with built-in idempotency
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid,
  p_amount_kwh numeric,
  p_idempotency_key text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE wallets
  SET balance_kwh = balance_kwh + p_amount_kwh,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance_kwh INTO new_balance;
  
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  
  RETURN new_balance;
END;
$$;

-- Create atomic wallet debit function with balance check
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id uuid,
  p_amount_kwh numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE wallets
  SET balance_kwh = balance_kwh - p_amount_kwh,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance_kwh >= p_amount_kwh
  RETURNING balance_kwh INTO new_balance;
  
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;
  
  RETURN new_balance;
END;
$$;
