-- Create appeal_documents storage bucket for appeal document uploads
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'appeal_documents',
  'appeal_documents',
  NULL,
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ],
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Enable public access to appeal_documents bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'appeal_documents');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'appeal_documents' AND auth.role() = 'authenticated');

-- Allow users to delete their own uploads
CREATE POLICY "User Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'appeal_documents' AND auth.uid() = owner);
