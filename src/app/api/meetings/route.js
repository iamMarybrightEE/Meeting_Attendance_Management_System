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

function isValidTime(timeStr) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
}

export async function GET(request) {
  try {
    const { user, error } = await verifyAuth(request);
    if (error) return unauthorizedResponse(error);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = (searchParams.get('search') || '').trim();

    // Get user profile to check role and get department details
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role_id, roles(name), department')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Continue anyway - user might exist
    }

    // Get the department ID for the user's department name
    let userDepartmentId = null;
    if (userProfile?.department) {
      const { data: deptData, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('name', userProfile.department)
        .single();
      
      if (deptError) {
        console.error('Department lookup error:', deptError);
      } else {
        userDepartmentId = deptData?.id;
      }
    }

    console.log('User Department Info:', {
      userId: user.id,
      deptName: userProfile?.department,
      deptId: userDepartmentId
    });

    let query = supabaseAdmin
      .from('meetings')
      .select(
        `
          id, title, description, date, start_time, end_time, type, category,
          organizer_id, chairperson_id, department_id, location, status, created_at, updated_at,
          organizer_id(id, first_name, last_name, email),
          chairperson_id(id, first_name, last_name, email),
          meeting_attendees(id, user_id, status, profiles(first_name, last_name, department))
        `,
        { count: 'exact' }
      )
      .eq('is_deleted', false)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Role-based meeting visibility filter
    const userRole = userProfile?.roles?.name;
    const isSystemAdmin = userRole === 'System Administrator';
    const isAdmin = userRole === 'Admin';

    // Build the query - all non-system-admin users need to fetch all meetings for client-side filtering
    // We'll handle role-based filtering after fetching

    if (status && ['scheduled', 'ongoing', 'ended', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }
    if (type && ['management', 'team'].includes(type)) {
      query = query.eq('type', type);
    }
    if (category && ['internal', 'external'].includes(category)) {
      query = query.eq('category', category);
    }
    if (dateFrom && isValidDate(dateFrom)) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo && isValidDate(dateTo)) {
      query = query.lte('date', dateTo);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    let { data, error: dbError, count } = await query;
    if (dbError) {
      console.error('Database query error:', dbError);
      return errorResponse(`Database error: ${dbError.message}`);
    }

    console.log('Raw meetings data count:', data?.length);
    if (data?.length > 0) {
      console.log('First meeting department_id:', data[0]?.department_id);
    }

    // Client-side role-based filtering
    if (data && !isSystemAdmin) {
      if (isAdmin) {
        // Admin sees all meetings in their department
        const filteredData = data.filter(meeting => {
          const matches = meeting.department_id === userDepartmentId;
          console.log(`Meeting ${meeting.id}: deptId=${meeting.department_id}, userDeptId=${userDepartmentId}, matches=${matches}`);
          return matches;
        });
        console.log(`Admin filter: ${data.length} meetings -> ${filteredData.length} meetings`);
        data = filteredData;
      } else if (userRole === 'Chairperson') {
        // Chairperson sees meetings they organized OR meetings they are invited to
        data = data.filter(meeting => {
          const organizerId = typeof meeting.organizer_id === 'object' ? meeting.organizer_id?.id : meeting.organizer_id;
          const isOrganizer = organizerId === user.id;
          const isAttendee = meeting.meeting_attendees?.some(attendee => {
            const attendeeUserId = typeof attendee.user_id === 'object' ? attendee.user_id?.id : attendee.user_id;
            return attendeeUserId === user.id;
          });
          return isOrganizer || isAttendee;
        });
      } else if (userRole === 'Staff') {
        // Staff sees meetings they are invited to OR meetings they created/organized
        data = data.filter(meeting => {
          const organizerId = typeof meeting.organizer_id === 'object' ? meeting.organizer_id?.id : meeting.organizer_id;
          const isOrganizer = organizerId === user.id;
          const isAttendee = meeting.meeting_attendees?.some(attendee => {
            const attendeeUserId = typeof attendee.user_id === 'object' ? attendee.user_id?.id : attendee.user_id;
            return attendeeUserId === user.id;
          });
          return isOrganizer || isAttendee;
        });
      }
    }

    // Expand chairperson_id for each meeting if it's just an ID
    if (data && data.length > 0) {
      const expandedData = await Promise.all(data.map(async (meeting) => {
        let expandedMeeting = { ...meeting };
        
        // Expand chairperson if it's just an ID string
        if (meeting.chairperson_id && typeof meeting.chairperson_id === 'string') {
          const { data: chairperson } = await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', meeting.chairperson_id)
            .single()
            .catch(() => ({ data: null }));
          
          if (chairperson) expandedMeeting.chairperson_id = chairperson;
        }
        
        return expandedMeeting;
      }));
      
      // Replace data with expanded version
      data = expandedData;
    }

    if (data && data.length > 0) {
      console.log('GET /api/meetings - Sample meeting with chairperson:', {
        id: data[0]?.id,
        title: data[0]?.title,
        chairperson_id: data[0]?.chairperson_id,
        organizer_id: data[0]?.organizer_id,
      });
    }

    return successResponse({ meetings: data || [], total: count || 0, limit, offset });
  } catch (err) {
    console.error('GET /api/meetings error:', err);
    return errorResponse(`Server error: ${err.message}`);
  }
}

export async function POST(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  // Get user profile to check role
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('role_id, roles(name)')
    .eq('id', user.id)
    .single();

  const userRole = userProfile?.roles?.name;
  const isAdmin = userRole === 'System Administrator' || userRole === 'Admin';

  // Check permission: only Admin can schedule management meetings
  if (body.type === 'management' && !isAdmin) {
    return forbiddenResponse('Only admins can schedule management meetings');
  }

  // Validate required fields
  if (!body.title || !body.title.trim()) {
    return errorResponse('Meeting title is required', 400);
  }
  if (!body.date || !isValidDate(body.date)) {
    return errorResponse('Valid date is required', 400);
  }
  if (!body.start_time || !isValidTime(body.start_time)) {
    return errorResponse('Valid start time is required', 400);
  }
  if (!body.end_time || !isValidTime(body.end_time)) {
    return errorResponse('Valid end time is required', 400);
  }
  if (!body.duration || body.duration <= 0) {
    return errorResponse('Valid duration (in minutes) is required', 400);
  }
  if (!body.location || !body.location.trim()) {
    return errorResponse('Location is required', 400);
  }
  if (!body.chairperson_id) {
    return errorResponse('Chairperson is required', 400);
  }
  if (!body.attendee_ids || !Array.isArray(body.attendee_ids) || body.attendee_ids.length === 0) {
    return errorResponse('At least one attendee is required', 400);
  }
  if (!['management', 'team'].includes(body.type)) {
    return errorResponse('Meeting type must be "management" or "team"', 400);
  }
  if (!['internal', 'external'].includes(body.category)) {
    return errorResponse('Meeting category must be "internal" or "external"', 400);
  }

  const newMeeting = {
    title: (body.title || '').trim().slice(0, 255),
    description: body.description ? (body.description || '').trim().slice(0, 1000) : null,
    date: body.date,
    start_time: body.start_time,
    end_time: body.end_time,
    duration: body.duration,
    type: body.type,
    category: body.category,
    location: (body.location || '').trim().slice(0, 255),
    chairperson_id: body.chairperson_id,
    external_link: body.external_link ? (body.external_link || '').trim() : null,
    organizer_id: user.id,
    department_id: body.department_id || null,
    created_by: user.id,
  };

  console.log('POST /api/meetings - Creating meeting:', {
    chairperson_id: newMeeting.chairperson_id,
    organizer_id: newMeeting.organizer_id,
    body_chairperson_id: body.chairperson_id,
    request_body_full: body,
  });

  const { data: meeting, error: createError } = await supabaseAdmin
    .from('meetings')
    .insert([newMeeting])
    .select('*')
    .single();

  if (createError) {
    console.error('POST /api/meetings - INSERT ERROR:', createError);
    return errorResponse(createError.message);
  }

  console.log('POST /api/meetings - Meeting created in DB:', {
    chairperson_id: meeting?.chairperson_id,
    organizer_id: meeting?.organizer_id,
    id: meeting?.id,
    full_meeting: meeting,
  });

  // Add meeting attendees
  if (body.attendee_ids && body.attendee_ids.length > 0) {
    const attendees = body.attendee_ids.map(userId => ({
      meeting_id: meeting.id,
      user_id: userId,
      status: 'pending',
    }));

    const { error: attendeeError } = await supabaseAdmin
      .from('meeting_attendees')
      .insert(attendees);

    if (attendeeError) {
      console.error('Error adding attendees:', attendeeError);
      // Continue anyway - meeting was created
    }
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'meeting.create',
    module: 'meetings',
    targetId: meeting.id,
    details: { title: meeting.title, type: meeting.type },
    ipAddress, userAgent,
  });

  return successResponse({ meeting }, 201);
}
