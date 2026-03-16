-- Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  date            DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('management', 'team')),
  category        TEXT NOT NULL CHECK (category IN ('internal', 'external')),
  organizer_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id   TEXT,
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled' 
                  CHECK (status IN ('scheduled', 'ongoing', 'ended', 'cancelled')),
  qr_code         TEXT,
  qr_code_url     TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting attendees table
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('present', 'missed', 'excused', 'pending')),
  confirmed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Absence appeals table
CREATE TABLE IF NOT EXISTS public.absence_appeals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes    TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- External participants table
CREATE TABLE IF NOT EXISTS public.external_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  organization    TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('present', 'missed', 'pending')),
  registration_token TEXT UNIQUE,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QR codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  code_data       TEXT NOT NULL,
  code_type       TEXT NOT NULL CHECK (code_type IN ('attendance', 'external')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- Meeting invitations table
CREATE TABLE IF NOT EXISTS public.meeting_invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON public.meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_department_id ON public.meetings(department_id);
CREATE INDEX IF NOT EXISTS idx_meetings_is_deleted ON public.meetings(is_deleted);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON public.meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_status ON public.meeting_attendees(status);
CREATE INDEX IF NOT EXISTS idx_absence_appeals_meeting_id ON public.absence_appeals(meeting_id);
CREATE INDEX IF NOT EXISTS idx_absence_appeals_user_id ON public.absence_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_absence_appeals_status ON public.absence_appeals(status);
CREATE INDEX IF NOT EXISTS idx_external_participants_meeting_id ON public.external_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_external_participants_email ON public.external_participants(email);
CREATE INDEX IF NOT EXISTS idx_qr_codes_meeting_id ON public.qr_codes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON public.meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_user_id ON public.meeting_invitations(user_id);

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_meeting_attendees_updated_at
  BEFORE UPDATE ON public.meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_absence_appeals_updated_at
  BEFORE UPDATE ON public.absence_appeals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_external_participants_updated_at
  BEFORE UPDATE ON public.external_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;
