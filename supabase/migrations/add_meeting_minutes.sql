-- Meeting Minutes table
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL UNIQUE REFERENCES public.meetings(id) ON DELETE CASCADE,
  recording_url   TEXT,
  transcript      TEXT,
  summary         TEXT,
  key_points      TEXT[],
  action_items    JSONB,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting_id ON public.meeting_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_status ON public.meeting_minutes(status);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER trg_meeting_minutes_updated_at
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read minutes for meetings they can access
CREATE POLICY "Users can read meeting minutes"
  ON public.meeting_minutes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND (
        m.organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.meeting_attendees ma
          WHERE ma.meeting_id = m.id AND ma.user_id = auth.uid()
        )
      )
    )
  );
