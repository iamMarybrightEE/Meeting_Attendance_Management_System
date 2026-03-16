-- Add document_url column to absence_appeals table
ALTER TABLE public.absence_appeals 
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_absence_appeals_document_url ON public.absence_appeals(document_url);
