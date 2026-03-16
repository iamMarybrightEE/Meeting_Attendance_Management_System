-- Enable RLS policies for real-time subscriptions

-- Enable RLS on all tables
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;

-- Meetings table policies
CREATE POLICY "Authenticated users can view meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Only organizer or admin can update meeting"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = organizer_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.roles r ON p.role_id = r.id 
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can create meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.roles r ON p.role_id = r.id 
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin', 'staff')
    )
  );

CREATE POLICY "Only organizer or admin can delete meeting"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (
    auth.uid() = organizer_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.roles r ON p.role_id = r.id 
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
    )
  );

-- Meeting attendees table policies
CREATE POLICY "Users can view meeting attendees"
  ON public.meeting_attendees FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Organizer or admin can manage attendees"
  ON public.meeting_attendees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Users can update their attendance"
  ON public.meeting_attendees FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Organizer or admin can delete attendance records"
  ON public.meeting_attendees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

-- Absence appeals table policies
CREATE POLICY "Users can view absence appeals"
  ON public.absence_appeals FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can submit absence appeals"
  ON public.absence_appeals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Organizer or admin can review appeals"
  ON public.absence_appeals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

-- External participants table policies
CREATE POLICY "Authenticated users can view external participants"
  ON public.external_participants FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Organizer or admin can add external participants"
  ON public.external_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Owner or organizer can update external participant"
  ON public.external_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

-- QR codes table policies
CREATE POLICY "Authenticated users can view QR codes"
  ON public.qr_codes FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Organizer or admin can manage QR codes"
  ON public.qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );

-- Meeting invitations table policies
CREATE POLICY "Authenticated users can view invitations"
  ON public.meeting_invitations FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Organizer or admin can send invitations"
  ON public.meeting_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND (
        auth.uid() = m.organizer_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          JOIN public.roles r ON p.role_id = r.id 
          WHERE p.id = auth.uid() AND r.name IN ('admin', 'super_admin')
        )
      )
    )
  );
