-- Add missing columns to profiles table
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);
