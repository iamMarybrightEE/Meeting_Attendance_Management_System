import { errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request, { params }) {
  const { id, participantId } = await params;
  if (!id || !isValidUUID(id) || !participantId || !isValidUUID(participantId)) {
    return errorResponse('Invalid meeting or participant ID', 400);
  }

  const { data: participant, error: dbError } = await supabaseAdmin
    .from('external_participants')
    .select('*')
    .eq('id', participantId)
    .eq('meeting_id', id)
    .single();

  if (dbError || !participant) return errorResponse('Participant not found', 404);

  return successResponse({ participant });
}

export async function PATCH(request, { params }) {
  const { id, participantId } = await params;
  if (!id || !isValidUUID(id) || !participantId || !isValidUUID(participantId)) {
    return errorResponse('Invalid meeting or participant ID', 400);
  }

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const { data: participant, error: fetchError } = await supabaseAdmin
    .from('external_participants')
    .select('id, status')
    .eq('id', participantId)
    .eq('meeting_id', id)
    .single();

  if (fetchError || !participant) return errorResponse('Participant not found', 404);

  const allowed = {};
  if (body.status !== undefined && ['present', 'missed', 'pending'].includes(body.status)) {
    allowed.status = body.status;
  }
  if (body.status === 'present') {
    allowed.confirmed_at = new Date().toISOString();
  }

  if (Object.keys(allowed).length === 0) return errorResponse('No valid fields to update', 400);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('external_participants')
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq('id', participantId)
    .select()
    .single();

  if (updateError) return errorResponse(updateError.message);

  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId: null,
    actorEmail: participant.email,
    action: 'external.attendance',
    module: 'meetings',
    targetId: id,
    targetEmail: participant.email,
    details: { status: allowed.status },
    ipAddress, userAgent,
  });

  return successResponse({ participant: updated });
}
