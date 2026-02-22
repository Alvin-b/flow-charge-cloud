-- Add email column to profiles (nullable to not break existing rows)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
