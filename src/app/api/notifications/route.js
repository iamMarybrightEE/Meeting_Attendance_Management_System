import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const { user, error } = await verifyAuth(request);
    if (error) return unauthorizedResponse(error);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const filter = searchParams.get('filter') || '';
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role_id, roles(name), department')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return successResponse({ notifications: [], total: 0, limit, offset });
    }

    const userRole = userProfile?.roles?.name;
    const isSystemAdmin = userRole === 'System Administrator';
    const isAdmin = userRole === 'Admin';
    const userDept = userProfile?.department;

    // Build notifications from meeting-related data
    const notifications = [];

    // 1. Get meetings scheduled/assigned to user (staff) or in their department (admin/sysadmin)
    let meetingQuery = supabaseAdmin
      .from('meetings')
      .select(`
        id, title, date, start_time, end_time, status, type,
        organizer_id(first_name, last_name),
        meeting_attendees(user_id, status, created_at),
        department_id
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Filter by role
    if (!isSystemAdmin && !isAdmin) {
      // Staff: only their meetings
      const { data: attendeeIds } = await supabaseAdmin
        .from('meeting_attendees')
        .select('meeting_id')
        .eq('user_id', user.id);

      const meetingIds = attendeeIds?.map(a => a.meeting_id) || [];
      if (meetingIds.length > 0) {
        meetingQuery = meetingQuery.in('id', meetingIds);
      } else {
        return successResponse({ notifications: [], total: 0, limit, offset });
      }
    } else if (isAdmin) {
      // Admin: their department only
      // Get department meetings
      const { data: deptMeetings } = await supabaseAdmin
        .from('meetings')
        .select('id')
        .eq('department_id', userDept)
        .eq('is_deleted', false);
      
      const deptMeetingIds = deptMeetings?.map(m => m.id) || [];
      
      // Get meetings where admin's department staff are attendees
      const { data: deptAttendees } = await supabaseAdmin
        .from('meeting_attendees')
        .select('meeting_id')
        .in('meeting_id', deptMeetingIds);

      const allMeetingIds = [...new Set([...deptMeetingIds, ...(deptAttendees?.map(a => a.meeting_id) || [])])];
      if (allMeetingIds.length > 0) {
        meetingQuery = meetingQuery.in('id', allMeetingIds);
      }
    }

    const { data: meetings } = await meetingQuery;

    if (meetings && meetings.length > 0) {
      for (const meeting of meetings) {
        const organizer = meeting.organizer_id;
        const attendees = meeting.meeting_attendees || [];

        // For staff: only add notification if they're invited/attending
        if (!isSystemAdmin && !isAdmin) {
          const userAttendee = attendees.find(a => a.user_id === user.id);
          if (userAttendee) {
            // Meeting scheduled notification
            notifications.push({
              id: `meeting-${meeting.id}-scheduled`,
              type: 'meeting_scheduled',
              title: meeting.title,
              message: `Meeting scheduled for ${meeting.date} at ${meeting.start_time}`,
              meeting_id: meeting.id,
              meeting_title: meeting.title,
              meeting_date: meeting.date,
              meeting_time: meeting.start_time,
              status: 'unread',
              created_at: meeting.created_at,
              action_type: 'view_meeting',
              action_url: `/meetings/${meeting.id}`,
              icon: 'event',
            });

            // Attendance confirmation needed
            if (meeting.status === 'scheduled' || meeting.status === 'ongoing') {
              if (userAttendee.status === 'pending') {
                notifications.push({
                  id: `meeting-${meeting.id}-confirm`,
                  type: 'confirm_attendance',
                  title: 'Action Required',
                  message: `Please confirm your attendance for "${meeting.title}"`,
                  meeting_id: meeting.id,
                  meeting_title: meeting.title,
                  meeting_date: meeting.date,
                  meeting_time: meeting.start_time,
                  status: 'unread',
                  created_at: userAttendee.created_at,
                  action_type: 'confirm_attendance',
                  action_url: `/attendance/confirm/${meeting.id}`,
                  icon: 'checkcircle',
                });
              } else if (userAttendee.status === 'present') {
                notifications.push({
                  id: `meeting-${meeting.id}-confirmed`,
                  type: 'attendance_confirmed',
                  title: 'Attendance Confirmed',
                  message: `Your attendance for "${meeting.title}" has been confirmed`,
                  meeting_id: meeting.id,
                  meeting_title: meeting.title,
                  status: 'read',
                  created_at: userAttendee.created_at,
                  action_type: 'view_attendance',
                  action_url: `/attendance`,
                  icon: 'confirmed',
                });
              }
            }

            // Meeting started notification
            if (meeting.status === 'ongoing') {
              notifications.push({
                id: `meeting-${meeting.id}-started`,
                type: 'meeting_started',
                title: meeting.title,
                message: `"${meeting.title}" has started. Meeting is ongoing.`,
                meeting_id: meeting.id,
                meeting_title: meeting.title,
                status: 'unread',
                created_at: meeting.updated_at,
                action_type: 'view_meeting',
                action_url: `/meetings/${meeting.id}`,
                icon: 'event',
              });
            }

            // Meeting ended notification
            if (meeting.status === 'ended') {
              notifications.push({
                id: `meeting-${meeting.id}-ended`,
                type: 'meeting_ended',
                title: meeting.title,
                message: `"${meeting.title}" has ended`,
                meeting_id: meeting.id,
                meeting_title: meeting.title,
                status: 'read',
                created_at: meeting.updated_at,
                action_type: 'view_meeting',
                action_url: `/meetings/${meeting.id}`,
                icon: 'event',
              });
            }
          }
        } else {
          // Admin or System Admin: show all departmental/system notifications
          notifications.push({
            id: `meeting-${meeting.id}-scheduled`,
            type: 'meeting_scheduled',
            title: meeting.title,
            message: `Meeting scheduled by ${organizer?.first_name} ${organizer?.last_name} for ${meeting.date}`,
            meeting_id: meeting.id,
            meeting_title: meeting.title,
            meeting_date: meeting.date,
            meeting_time: meeting.start_time,
            organizer: `${organizer?.first_name} ${organizer?.last_name}`,
            attendee_count: attendees.length,
            status: 'unread',
            created_at: meeting.created_at,
            action_type: 'view_meeting',
            action_url: `/meetings/${meeting.id}`,
            icon: 'event',
          });

          // Meeting started notification
          if (meeting.status === 'ongoing') {
            notifications.push({
              id: `meeting-${meeting.id}-started`,
              type: 'meeting_started',
              title: meeting.title,
              message: `"${meeting.title}" has started. ${attendees.length} attendees.`,
              meeting_id: meeting.id,
              meeting_title: meeting.title,
              attendee_count: attendees.length,
              status: 'unread',
              created_at: meeting.updated_at,
              action_type: 'view_meeting',
              action_url: `/meetings/${meeting.id}`,
              icon: 'event',
            });
          }

          // Meeting ended notification
          if (meeting.status === 'ended') {
            notifications.push({
              id: `meeting-${meeting.id}-ended`,
              type: 'meeting_ended',
              title: meeting.title,
              message: `"${meeting.title}" has ended`,
              meeting_id: meeting.id,
              meeting_title: meeting.title,
              status: 'read',
              created_at: meeting.updated_at,
              action_type: 'view_meeting',
              action_url: `/meetings/${meeting.id}`,
              icon: 'event',
            });
          }
        }
      }
    }

    // 2. Get appeals (if any exist in DB)
    try {
      const { data: appeals } = await supabaseAdmin
        .from('appeals')
        .select(`
          id, meeting_id, user_id, status, reason, created_at,
          assigned_to(first_name, last_name),
          profiles(first_name, last_name, department)
        `)
        .order('created_at', { ascending: false });

      if (appeals && appeals.length > 0) {
        for (const appeal of appeals) {
          // Staff sees their own appeals
          if (!isSystemAdmin && !isAdmin && appeal.user_id === user.id) {
            if (appeal.status === 'sent') {
              notifications.push({
                id: `appeal-${appeal.id}-sent`,
                type: 'appeal_sent',
                title: 'Appeal Submitted',
                message: `Your appeal for missing attendance has been submitted`,
                appeal_id: appeal.id,
                status: 'unread',
                created_at: appeal.created_at,
                action_type: 'view_appeal',
                action_url: `/appeals/${appeal.id}`,
                icon: 'warning',
              });
            } else if (appeal.status === 'approved' || appeal.status === 'rejected') {
              notifications.push({
                id: `appeal-${appeal.id}-reviewed`,
                type: 'appeal_reviewed',
                title: `Appeal ${appeal.status === 'approved' ? 'Approved' : 'Rejected'}`,
                message: `Your appeal has been ${appeal.status}. Reason: ${appeal.reason}`,
                appeal_id: appeal.id,
                review_status: appeal.status,
                status: 'unread',
                created_at: appeal.created_at,
                action_type: 'view_appeal',
                action_url: `/appeals/${appeal.id}`,
                icon: 'verified',
              });
            }
          }
          // Admin sees departmental appeals
          else if (isAdmin && appeal.profiles?.department === userDept) {
            notifications.push({
              id: `appeal-${appeal.id}-received`,
              type: 'appeal_received',
              title: 'New Appeal',
              message: `${appeal.profiles?.first_name} ${appeal.profiles?.last_name} submitted an appeal`,
              appeal_id: appeal.id,
              appeal_by: `${appeal.profiles?.first_name} ${appeal.profiles?.last_name}`,
              status: 'unread',
              created_at: appeal.created_at,
              action_type: 'review_appeal',
              action_url: `/appeals/${appeal.id}`,
              icon: 'warning',
            });
          }
          // System admin sees all appeals
          else if (isSystemAdmin) {
            notifications.push({
              id: `appeal-${appeal.id}-received`,
              type: 'appeal_received',
              title: 'New Appeal',
              message: `Appeal from ${appeal.profiles?.first_name} ${appeal.profiles?.last_name}`,
              appeal_id: appeal.id,
              appeal_by: `${appeal.profiles?.first_name} ${appeal.profiles?.last_name}`,
              department: appeal.profiles?.department,
              status: 'unread',
              created_at: appeal.created_at,
              action_type: 'review_appeal',
              action_url: `/appeals/${appeal.id}`,
              icon: 'warning',
            });
          }
        }
      }
    } catch (err) {
      // Alerts table might not exist yet, continue without it
      console.log('Appeals data unavailable');
    }

    // Filter by type if specified
    let filtered = notifications;
    if (filter && filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }

    // Filter unread only
    if (unreadOnly) {
      filtered = filtered.filter(n => n.status === 'unread');
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Paginate
    const total = filtered.length;
    const paginatedNotifications = filtered.slice(offset, offset + limit);

    return successResponse({ notifications: paginatedNotifications, total, limit, offset });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return errorResponse(`Server error: ${err.message}`);
  }
}
