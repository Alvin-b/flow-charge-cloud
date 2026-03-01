-- Drop the redundant "Service role manages transactions" policy
-- Service role already bypasses RLS entirely, so USING(true)/WITH CHECK(true) is unnecessary
DROP POLICY IF EXISTS "Service role manages transactions" ON public.transactions;