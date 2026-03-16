import { verifyAuth, unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';
import { generateQRCodeData, generateRegistrationToken } from '@/lib/qrCodeGenerator';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  // Check if meeting exists and user has access
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('organizer_id, status')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (meetingError || !meeting) return errorResponse('Meeting not found', 404);

  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
  const isOrganizer = meeting.organizer_id === user.id;

  if (!isAdmin && !isOrganizer) {
    return forbiddenResponse('Only organizer or admin can view attendance');
  }

  let query = supabaseAdmin
    .from('meeting_attendees')
    .select(
      `
        id, user_id, status, confirmed_at, notes, created_at,
        profiles:user_id(id, first_name, last_name, email, employee_id)
      `,
      { count: 'exact' }
    )
    .eq('meeting_id', id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status && ['present', 'missed', 'excused', 'pending'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data: attendees, error: dbError, count } = await query;
  if (dbError) return errorResponse(dbError.message);

  return successResponse({ attendees: attendees || [], total: count || 0, limit, offset });
}

export async function POST(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  // Check if meeting exists and is ongoing
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, organizer_id')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (meetingError || !meeting) return errorResponse('Meeting not found', 404);

  if (meeting.status !== 'ongoing') {
    return errorResponse('Attendance can only be confirmed for ongoing meetings', 400);
  }

  const userId = body.user_id || user.id;

  // Verify user exists
  const { data: userExists } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('is_deleted', false)
    .single();

  if (!userExists) return errorResponse('User not found', 404);

  // Check if attendance already confirmed
  const { data: existingAttendance } = await supabaseAdmin
    .from('meeting_attendees')
    .select('id, status')
    .eq('meeting_id', id)
    .eq('user_id', userId)
    .single();

  if (existingAttendance && existingAttendance.status === 'present') {
    return errorResponse('Attendance already confirmed', 400);
  }

  const payload = {
    meeting_id: id,
    user_id: userId,
    status: 'present',
    confirmed_at: new Date().toISOString(),
    notes: body.notes ? (body.notes || '').trim().slice(0, 500) : null,
  };

  if (existingAttendance) {
    // Update existing record
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('meeting_attendees')
      .update({
        status: 'present',
        confirmed_at: payload.confirmed_at,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingAttendance.id)
      .select('*')
      .single();

    if (updateError) return errorResponse(updateError.message);

    const { actorId, actorEmail } = getActorInfo(user);
    const { ipAddress, userAgent } = getRequestMeta(request);
    await logAudit({
      actorId, actorEmail,
      action: 'attendance.confirm',
      module: 'meetings',
      targetId: id,
      details: { user_id: userId },
      ipAddress, userAgent,
    });

    return successResponse({ attendance: updated });
  } else {
    // Create new record
    const { data: created, error: createError } = await supabaseAdmin
      .from('meeting_attendees')
      .insert([payload])
      .select('*')
      .single();

    if (createError) return errorResponse(createError.message);

    const { actorId, actorEmail } = getActorInfo(user);
    const { ipAddress, userAgent } = getRequestMeta(request);
    await logAudit({
      actorId, actorEmail,
      action: 'attendance.confirm',
      module: 'meetings',
      targetId: id,
      details: { user_id: userId },
      ipAddress, userAgent,
    });

    return successResponse({ attendance: created }, 201);
  }
}
