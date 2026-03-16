import { verifyAuth, unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

export async function GET(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('type') || 'meeting'; // meeting, staff, department, date-range
  const meetingId = searchParams.get('meeting_id');
  const userId = searchParams.get('user_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const format = searchParams.get('format') || 'json'; // json, csv
  const departmentId = searchParams.get('department_id');

  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name), department')
    .eq('id', user.id)
    .single();

  const userRole = userProfile?.roles?.name;
  const isAdmin = userRole === 'System Administrator' || userRole === 'Admin';

  let query;
  let reportData = [];
  let fileName = `report_${Date.now()}`;

  try {
    if (reportType === 'meeting') {
      if (!meetingId || !isValidUUID(meetingId)) {
        return errorResponse('Valid meeting_id is required for meeting reports', 400);
      }

      const { data: meeting } = await supabaseAdmin
        .from('meetings')
        .select('id, organizer_id')
        .eq('id', meetingId)
        .eq('is_deleted', false)
        .single();

      if (!meeting) return errorResponse('Meeting not found', 404);

      if (meeting.organizer_id !== user.id && !isAdmin) {
        return forbiddenResponse('You do not have access to this report');
      }

      const { data: meetingDetails } = await supabaseAdmin
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      const { data: attendees } = await supabaseAdmin
        .from('meeting_attendees')
        .select('*')
        .eq('meeting_id', meetingId);

      const { data: externalParticipants } = await supabaseAdmin
        .from('external_participants')
        .select('*')
        .eq('meeting_id', meetingId);

      // Fetch profiles for attendees
      const userIds = attendees?.map(a => a.user_id) || [];
      const { data: profiles } = userIds.length > 0
        ? await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, email, employee_id')
            .in('id', userIds)
        : { data: [] };

      const profileMap = {};
      profiles?.forEach(p => {
        profileMap[p.id] = p;
      });

      reportData = {
        meeting: meetingDetails,
        attendees: (attendees || []).map(a => {
          const profile = profileMap[a.user_id];
          return {
            name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
            email: profile?.email,
            employee_id: profile?.employee_id,
            status: a.status,
            confirmed_at: a.confirmed_at,
          };
        }),
        external_participants: externalParticipants || [],
        total_internal: attendees?.length || 0,
        total_external: externalParticipants?.length || 0,
        present_count: attendees?.filter(a => a.status === 'present').length || 0,
        missed_count: attendees?.filter(a => a.status === 'missed').length || 0,
        excused_count: attendees?.filter(a => a.status === 'excused').length || 0,
      };

      fileName = `meeting_report_${meetingId}`;
    } else if (reportType === 'staff') {
      if (!userId || !isValidUUID(userId)) {
        return errorResponse('Valid user_id is required for staff reports', 400);
      }

      if (userId !== user.id && !isAdmin) {
        return forbiddenResponse('You can only view your own staff report');
      }

      const { data: staffProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!staffProfile) return errorResponse('Staff member not found', 404);

      let attendanceQuery = supabaseAdmin
        .from('meeting_attendees')
        .select(`
          id, meeting_id, status, confirmed_at,
          meetings(title, date, start_time, end_time, type, organizer_id)
        `)
        .eq('user_id', userId);

      if (dateFrom && isValidDate(dateFrom)) {
        attendanceQuery = attendanceQuery.gte('meetings.date', dateFrom);
      }
      if (dateTo && isValidDate(dateTo)) {
        attendanceQuery = attendanceQuery.lte('meetings.date', dateTo);
      }

      const { data: attendance } = await attendanceQuery;

      const { data: appeals } = await supabaseAdmin
        .from('absence_appeals')
        .select('*')
        .eq('user_id', userId);

      reportData = {
        staff: {
          name: `${staffProfile.first_name} ${staffProfile.last_name}`,
          email: staffProfile.email,
          employee_id: staffProfile.employee_id,
          department: staffProfile.department,
        },
        meetings_attended: (attendance || []).map(a => ({
          meeting_title: a.meetings?.title,
          date: a.meetings?.date,
          time: `${a.meetings?.start_time} - ${a.meetings?.end_time}`,
          status: a.status,
          confirmed_at: a.confirmed_at,
        })),
        total_meetings: attendance?.length || 0,
        present_count: attendance?.filter(a => a.status === 'present').length || 0,
        missed_count: attendance?.filter(a => a.status === 'missed').length || 0,
        excused_count: attendance?.filter(a => a.status === 'excused').length || 0,
        appeals_submitted: appeals?.length || 0,
        appeals_approved: appeals?.filter(a => a.status === 'approved').length || 0,
        appeals_rejected: appeals?.filter(a => a.status === 'rejected').length || 0,
      };

      fileName = `staff_report_${staffProfile.employee_id || userId}`;
    } else if (reportType === 'department') {
      if (!isAdmin && !departmentId) {
        return errorResponse('Admin access required for department reports', 403);
      }

      let meetingQuery = supabaseAdmin
        .from('meetings')
        .select('*')
        .eq('is_deleted', false);

      if (departmentId) {
        meetingQuery = meetingQuery.eq('department_id', departmentId);
      }

      const { data: meetings } = await meetingQuery;

      const reportStats = {
        total_meetings: meetings?.length || 0,
        total_attendances: 0,
        total_present: 0,
        total_missed: 0,
        total_excused: 0,
        meetings_by_type: {},
        meetings_by_category: {},
      };

      for (const meeting of meetings || []) {
        const { data: attendees } = await supabaseAdmin
          .from('meeting_attendees')
          .select('status')
          .eq('meeting_id', meeting.id);

        reportStats.total_attendances += attendees?.length || 0;
        reportStats.total_present += attendees?.filter(a => a.status === 'present').length || 0;
        reportStats.total_missed += attendees?.filter(a => a.status === 'missed').length || 0;
        reportStats.total_excused += attendees?.filter(a => a.status === 'excused').length || 0;

        reportStats.meetings_by_type[meeting.type] = (reportStats.meetings_by_type[meeting.type] || 0) + 1;
        reportStats.meetings_by_category[meeting.category] = (reportStats.meetings_by_category[meeting.category] || 0) + 1;
      }

      reportData = {
        department: departmentId || 'All Departments',
        generated_at: new Date().toISOString(),
        ...reportStats,
      };

      fileName = `department_report_${departmentId || 'all'}`;
    } else if (reportType === 'date-range') {
      if (!dateFrom || !dateTo || !isValidDate(dateFrom) || !isValidDate(dateTo)) {
        return errorResponse('Valid date_from and date_to are required', 400);
      }

      let meetingQuery = supabaseAdmin
        .from('meetings')
        .select(`
          id, title, date, start_time, end_time, type, category, organizer_id,
          profiles:organizer_id(first_name, last_name)
        `)
        .eq('is_deleted', false)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (!isAdmin && departmentId) {
        meetingQuery = meetingQuery.eq('department_id', departmentId);
      }

      const { data: meetings } = await meetingQuery;

      const meetingsWithAttendance = await Promise.all(
        (meetings || []).map(async (meeting) => {
          const { data: attendees } = await supabaseAdmin
            .from('meeting_attendees')
            .select('status')
            .eq('meeting_id', meeting.id);

          return {
            title: meeting.title,
            date: meeting.date,
            time: `${meeting.start_time} - ${meeting.end_time}`,
            organizer: `${meeting.profiles?.first_name} ${meeting.profiles?.last_name}`,
            type: meeting.type,
            category: meeting.category,
            total_attendees: attendees?.length || 0,
            present: attendees?.filter(a => a.status === 'present').length || 0,
            missed: attendees?.filter(a => a.status === 'missed').length || 0,
            excused: attendees?.filter(a => a.status === 'excused').length || 0,
          };
        })
      );

      reportData = {
        date_range: `${dateFrom} to ${dateTo}`,
        generated_at: new Date().toISOString(),
        total_meetings: meetingsWithAttendance.length,
        meetings: meetingsWithAttendance,
      };

      fileName = `date_range_report_${dateFrom}_${dateTo}`;
    } else {
      return errorResponse('Invalid report type', 400);
    }

    const { actorId, actorEmail } = getActorInfo(user);
    const { ipAddress, userAgent } = getRequestMeta(request);
    await logAudit({
      actorId, actorEmail,
      action: 'report.generate',
      module: 'meetings',
      details: { report_type: reportType, format },
      ipAddress, userAgent,
    });

    if (format === 'csv') {
      const csvData = Array.isArray(reportData) ? reportData : [reportData];
      const csv = convertToCSV(Array.isArray(reportData) ? reportData.meetings || csvData : csvData);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}.csv"`,
        },
      });
    }

    return successResponse({ report: reportData });
  } catch (err) {
    return errorResponse(`Report generation failed: ${err.message}`);
  }
}
