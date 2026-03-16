import { verifyAuth, unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id: meetingId, appealId } = await params;
  if (!meetingId || !isValidUUID(meetingId) || !appealId || !isValidUUID(appealId)) {
    return errorResponse('Invalid meeting or appeal ID', 400);
  }

  const { data: appeal, error: dbError } = await supabaseAdmin
    .from('absence_appeals')
    .select('*')
    .eq('id', appealId)
    .eq('meeting_id', meetingId)
    .single();

  if (dbError || !appeal) return errorResponse('Appeal not found', 404);

  // Check access
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('organizer_id')
    .eq('id', meetingId)
    .single();

  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
  const isOrganizer = meeting?.organizer_id === user.id;
  const isAppealant = appeal.user_id === user.id;

  if (!isAdmin && !isOrganizer && !isAppealant) {
    return forbiddenResponse('You do not have access to this appeal');
  }

  return successResponse({ appeal });
}

export async function PATCH(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id: meetingId, appealId } = await params;
  if (!meetingId || !isValidUUID(meetingId) || !appealId || !isValidUUID(appealId)) {
    return errorResponse('Invalid meeting or appeal ID', 400);
  }

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const { data: appeal, error: fetchError } = await supabaseAdmin
    .from('absence_appeals')
    .select('id, meeting_id, user_id, status')
    .eq('id', appealId)
    .eq('meeting_id', meetingId)
    .single();

  if (fetchError || !appeal) return errorResponse('Appeal not found', 404);

  if (appeal.status !== 'pending') {
    return errorResponse('Can only review pending appeals', 400);
  }

  // Check if user is organizer or admin
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('organizer_id')
    .eq('id', meetingId)
    .single();

  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
  const isOrganizer = meeting?.organizer_id === user.id;

  if (!isAdmin && !isOrganizer) {
    return forbiddenResponse('Only organizer or admin can review appeals');
  }

  if (!['approved', 'rejected'].includes(body.status)) {
    return errorResponse('Status must be "approved" or "rejected"', 400);
  }

  const payload = {
    status: body.status,
    review_notes: body.review_notes ? (body.review_notes || '').trim().slice(0, 1000) : null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('absence_appeals')
    .update(payload)
    .eq('id', appealId)
    .select('*')
    .single();

  if (updateError) return errorResponse(updateError.message);

  // Update attendance status based on appeal decision
  if (body.status === 'approved') {
    await supabaseAdmin
      .from('meeting_attendees')
      .update({
        status: 'excused',
        updated_at: new Date().toISOString(),
      })
      .eq('meeting_id', meetingId)
      .eq('user_id', appeal.user_id);
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: `appeal.${body.status}`,
    module: 'meetings',
    targetId: meetingId,
    targetEmail: updated.profiles?.email,
    details: { appeal_id: appealId, status: body.status },
    ipAddress, userAgent,
  });

  return successResponse({ appeal: updated });
}
