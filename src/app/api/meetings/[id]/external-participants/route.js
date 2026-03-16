import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  const status = searchParams.get('status');

  // Check meeting exists
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (!meeting) return errorResponse('Meeting not found', 404);

  let query = supabaseAdmin
    .from('external_participants')
    .select(
      `
        id, full_name, organization, email, phone, status, confirmed_at, created_at
      `,
      { count: 'exact' }
    )
    .eq('meeting_id', id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status && ['present', 'missed', 'pending'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data: participants, error: dbError, count } = await query;
  if (dbError) return errorResponse(dbError.message);

  return successResponse({ participants: participants || [], total: count || 0, limit, offset });
}

export async function POST(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  // Check meeting exists
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id, organizer_id')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (!meeting) return errorResponse('Meeting not found', 404);

  // Validate required fields
  if (!body.full_name || !body.full_name.trim()) {
    return errorResponse('Full name is required', 400);
  }
  if (!body.organization || !body.organization.trim()) {
    return errorResponse('Organization is required', 400);
  }
  if (!body.email || !isValidEmail(body.email)) {
    return errorResponse('Valid email is required', 400);
  }

  const payload = {
    meeting_id: id,
    full_name: (body.full_name || '').trim().slice(0, 255),
    organization: (body.organization || '').trim().slice(0, 255),
    email: (body.email || '').trim().toLowerCase().slice(0, 255),
    phone: body.phone ? (body.phone || '').trim().slice(0, 50) : null,
    status: 'pending',
  };

  const { data: external, error: createError } = await supabaseAdmin
    .from('external_participants')
    .insert([payload])
    .select()
    .single();

  if (createError) return errorResponse(createError.message);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'external.register',
    module: 'meetings',
    targetId: id,
    targetEmail: payload.email,
    details: { full_name: payload.full_name },
    ipAddress, userAgent,
  });

  return successResponse({ participant: external }, 201);
}
