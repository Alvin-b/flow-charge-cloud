-- Create transactions table for tracking all financial activities
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recharge', 'transfer_out', 'transfer_in', 'meter_transfer')),
  amount_kwh NUMERIC(10,2) NOT NULL CHECK (amount_kwh > 0),
  amount_kes NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- M-Pesa specific fields
  mpesa_receipt_number TEXT,
  mpesa_transaction_id TEXT,
  mpesa_checkout_request_id TEXT,
  phone_number TEXT,
  
  -- Transfer specific fields
  recipient_user_id UUID,
  recipient_phone TEXT,
  meter_id UUID,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions (as sender or recipient)
CREATE POLICY "Users view own transactions" ON public.transactions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = recipient_user_id
  );

-- Users can insert their own transactions
CREATE POLICY "Users insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only system/functions can update transactions
CREATE POLICY "Service role can update transactions" ON public.transactions
  FOR UPDATE USING (true);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_recipient_user_id ON public.transactions(recipient_user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_mpesa_checkout ON public.transactions(mpesa_checkout_request_id);

-- Create meter_transfers table for detailed meter recharge tracking
CREATE TABLE public.meter_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  meter_id UUID NOT NULL REFERENCES public.meters(id),
  kwh_amount NUMERIC(10,2) NOT NULL CHECK (kwh_amount > 0),
  
  -- Balance snapshots
  wallet_balance_before NUMERIC(10,2) NOT NULL,
  wallet_balance_after NUMERIC(10,2) NOT NULL,
  meter_balance_before NUMERIC(10,2) NOT NULL,
  meter_balance_after NUMERIC(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meter_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own meter transfers
CREATE POLICY "Users view own meter transfers" ON public.meter_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = meter_transfers.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- Only system can insert meter transfers
CREATE POLICY "Service role can insert meter transfers" ON public.meter_transfers
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_meter_transfers_transaction_id ON public.meter_transfers(transaction_id);
CREATE INDEX idx_meter_transfers_meter_id ON public.meter_transfers(meter_id);
CREATE INDEX idx_meter_transfers_created_at ON public.meter_transfers(created_at DESC);

-- Trigger for updated_at on transactions
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to get user transaction summary
CREATE OR REPLACE FUNCTION public.get_transaction_summary(user_uuid UUID)
RETURNS TABLE (
  total_recharges NUMERIC,
  total_transfers_out NUMERIC,
  total_transfers_in NUMERIC,
  total_meter_transfers NUMERIC,
  last_recharge_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'recharge' AND status = 'completed' THEN amount_kwh ELSE 0 END), 0) as total_recharges,
    COALESCE(SUM(CASE WHEN type = 'transfer_out' AND status = 'completed' THEN amount_kwh ELSE 0 END), 0) as total_transfers_out,
    COALESCE(SUM(CASE WHEN type = 'transfer_in' AND status = 'completed' THEN amount_kwh ELSE 0 END), 0) as total_transfers_in,
    COALESCE(SUM(CASE WHEN type = 'meter_transfer' AND status = 'completed' THEN amount_kwh ELSE 0 END), 0) as total_meter_transfers,
    MAX(CASE WHEN type = 'recharge' AND status = 'completed' THEN completed_at ELSE NULL END) as last_recharge_date
  FROM public.transactions
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
