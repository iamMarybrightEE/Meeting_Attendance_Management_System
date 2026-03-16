-- Drop only the essential foreign key constraints that need to point to profiles
-- This avoids ambiguous relationships (multiple FKs to same table)
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_organizer_id_fkey;
ALTER TABLE public.meeting_attendees DROP CONSTRAINT IF EXISTS meeting_attendees_user_id_fkey;
ALTER TABLE public.absence_appeals DROP CONSTRAINT IF EXISTS absence_appeals_user_id_fkey;
ALTER TABLE public.meeting_invitations DROP CONSTRAINT IF EXISTS meeting_invitations_user_id_fkey;

-- Re-add foreign key constraints pointing to profiles instead of auth.users
-- Only for the main user references (organizer, attendee, appeal author)
-- Keep 'created_by' and 'reviewed_by' pointing to auth.users for audit tracking
ALTER TABLE public.meetings
ADD CONSTRAINT meetings_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_attendees
ADD CONSTRAINT meeting_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.absence_appeals
ADD CONSTRAINT absence_appeals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_invitations
ADD CONSTRAINT meeting_invitations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
