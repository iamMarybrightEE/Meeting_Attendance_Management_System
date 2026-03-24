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

-- Create meetings storage bucket for meeting recordings and documents
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'meetings',
  'meetings',
  NULL,
  true,
  524288000, -- 500MB for video files
  ARRAY[
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'text/plain',
    'application/json'
  ],
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Enable public access to meetings bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'meetings');

-- Allow authenticated users to upload to meetings bucket
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meetings' AND auth.role() = 'authenticated');

-- Allow users to delete their own uploads from meetings bucket
CREATE POLICY "User Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'meetings' AND auth.uid() = owner);
