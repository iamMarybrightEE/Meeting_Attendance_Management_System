-- Add missing columns to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS chairperson_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duration INTEGER, -- duration in minutes
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS registration_token TEXT UNIQUE;

-- Create index for chairperson_id for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_chairperson_id ON public.meetings(chairperson_id);
