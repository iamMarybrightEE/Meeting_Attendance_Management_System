import { verifyAuth, unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';
import { generateRegistrationToken } from '@/lib/qrCodeGenerator';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isValidTime(timeStr) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
}

function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    let user = null;
    let isTokenAccess = false;

    if (token) {
      // Token-based access for attendance confirmation
      isTokenAccess = true;
    } else {
      // Normal authenticated access
      const authResult = await verifyAuth(request);
      if (authResult.error) return unauthorizedResponse(authResult.error);
      user = authResult.user;
    }

    const { data: meeting, error: dbError } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (dbError) {
      console.error('Meeting fetch error:', dbError, 'ID:', id);
      return errorResponse(`Meeting not found: ${dbError?.message || 'Unknown error'}`, 404);
    }
    
    if (!meeting) {
      console.error('Meeting is null for ID:', id);
      return errorResponse('Meeting not found', 404);
    }

    // Now get the expanded data separately to avoid issues
    let expandedMeeting = { ...meeting };
    
    if (meeting.organizer_id) {
      const { data: organizer } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', meeting.organizer_id)
        .single();
      if (organizer) expandedMeeting.organizer_id = organizer;
    }

    if (meeting.chairperson_id) {
      const { data: chairperson } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', meeting.chairperson_id)
        .single();
      if (chairperson) expandedMeeting.chairperson_id = chairperson;
    }

    const { data: attendees } = await supabaseAdmin
      .from('meeting_attendees')
      .select('id, user_id, status, confirmed_at, notes, profiles(id, first_name, last_name, email)')
      .eq('meeting_id', id);
    if (attendees) expandedMeeting.meeting_attendees = attendees;

    const { data: externals } = await supabaseAdmin
      .from('external_participants')
      .select('*')
      .eq('meeting_id', id);
    if (externals) expandedMeeting.external_participants = externals;

    if (isTokenAccess) {
      // For token access, verify the token matches
      if (expandedMeeting.registration_token !== token) {
        return errorResponse('Invalid token', 403);
      }
      // Return limited meeting data for attendance confirmation
      return successResponse({
        meeting: {
          id: expandedMeeting.id,
          title: expandedMeeting.title,
          date: expandedMeeting.date,
          start_time: expandedMeeting.start_time,
          end_time: expandedMeeting.end_time,
          location: expandedMeeting.location,
          status: expandedMeeting.status,
          registration_token: expandedMeeting.registration_token,
        }
      });
    }

    // For authenticated users, return full meeting data
    return successResponse({ meeting: expandedMeeting });
  } catch (err) {
    console.error('GET /api/meetings/[id] error:', err);
    return errorResponse(`Server error: ${err.message}`, 500);
  }
}

export async function PATCH(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const { data: meeting, error: fetchError } = await supabaseAdmin
    .from('meetings')
    .select('organizer_id, chairperson_id, status')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (fetchError || !meeting) return errorResponse('Meeting not found', 404);

  // Only organizer, chairperson, or admin can update
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
  const isOrganizer = meeting.organizer_id === user.id;
  const isChairperson = meeting.chairperson_id === user.id;
  
  if (!isOrganizer && !isChairperson && !isAdmin) {
    return forbiddenResponse('Only meeting organizer, chairperson, or admin can update');
  }

  // Can't update ended or cancelled meetings (except allowing transition to these states)
  if (['ended', 'cancelled'].includes(meeting.status) && body.status !== meeting.status) {
    return errorResponse('Cannot update ended or cancelled meetings', 400);
  }

  const allowed = {};
  if (body.title !== undefined) allowed.title = (body.title || '').trim().slice(0, 255);
  if (body.description !== undefined) allowed.description = body.description ? (body.description || '').trim().slice(0, 1000) : null;
  if (body.location !== undefined) allowed.location = (body.location || '').trim().slice(0, 255);
  if (body.date !== undefined && isValidDate(body.date)) allowed.date = body.date;
  if (body.start_time !== undefined && isValidTime(body.start_time)) allowed.start_time = body.start_time;
  if (body.end_time !== undefined && isValidTime(body.end_time)) allowed.end_time = body.end_time;
  if (body.duration !== undefined && body.duration > 0) allowed.duration = body.duration;
  if (body.type !== undefined && ['management', 'team'].includes(body.type)) allowed.type = body.type;
  if (body.category !== undefined && ['internal', 'external'].includes(body.category)) allowed.category = body.category;
  if (body.chairperson_id !== undefined) allowed.chairperson_id = body.chairperson_id;
  if (body.external_link !== undefined) allowed.external_link = body.external_link ? (body.external_link || '').trim() : null;
  if (body.status !== undefined && ['scheduled', 'ongoing', 'ended', 'cancelled'].includes(body.status)) {
    allowed.status = body.status;
  }

  if (Object.keys(allowed).length === 0) return errorResponse('No valid fields to update', 400);

  // Update attendees if provided
  if (body.attendee_ids && Array.isArray(body.attendee_ids)) {
    // Delete existing attendees
    await supabaseAdmin
      .from('meeting_attendees')
      .delete()
      .eq('meeting_id', id);

    // Add new attendees
    if (body.attendee_ids.length > 0) {
      const attendees = body.attendee_ids.map(userId => ({
        meeting_id: id,
        user_id: userId,
        status: 'pending',
      }));

      const { error: attendeeError } = await supabaseAdmin
        .from('meeting_attendees')
        .insert(attendees);

      if (attendeeError) {
        console.error('Error updating attendees:', attendeeError);
      }
    }
  }

  // Generate registration token when meeting starts
  if (allowed.status === 'ongoing' && !meeting.registration_token) {
    const token = generateRegistrationToken();
    allowed.registration_token = token;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('meetings')
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) return errorResponse(updateError.message);

  // Mark non-confirmed attendees as missed when meeting ends
  if (allowed.status === 'ended') {
    const { data: pendingAttendees } = await supabaseAdmin
      .from('meeting_attendees')
      .select('id')
      .eq('meeting_id', id)
      .eq('status', 'pending');

    if (pendingAttendees && pendingAttendees.length > 0) {
      await supabaseAdmin
        .from('meeting_attendees')
        .update({ status: 'missed', updated_at: new Date().toISOString() })
        .eq('meeting_id', id)
        .eq('status', 'pending');
    }
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'meeting.update',
    module: 'meetings',
    targetId: id,
    details: allowed,
    ipAddress, userAgent,
  });

  return successResponse({ meeting: updated });
}

export async function DELETE(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  const { data: meeting, error: fetchError } = await supabaseAdmin
    .from('meetings')
    .select('organizer_id')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (fetchError || !meeting) return errorResponse('Meeting not found', 404);

  // Only organizer or admin can delete
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
  if (meeting.organizer_id !== user.id && !isAdmin) {
    return forbiddenResponse('Only meeting organizer or admin can delete');
  }

  const { error: deleteError } = await supabaseAdmin
    .from('meetings')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (deleteError) return errorResponse(deleteError.message);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'meeting.delete',
    module: 'meetings',
    targetId: id,
    ipAddress, userAgent,
  });

  return successResponse({ message: 'Meeting deleted successfully' });
}
