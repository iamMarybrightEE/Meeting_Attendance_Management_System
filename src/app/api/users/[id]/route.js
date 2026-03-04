import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid user ID', 400);

  const { data: profile, error: dbError } = await supabaseAdmin
    .from('profiles')
    .select(`
      *,
      roles (
        id, name, description,
        role_permissions (
          permissions ( id, module, action, description )
        )
      )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (dbError || !profile) return errorResponse('User not found', 404);

  return successResponse({ user: profile });
}

export async function PATCH(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid user ID', 400);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const allowed = {};
  if (body.first_name !== undefined) allowed.first_name = (body.first_name || '').trim().slice(0, 100);
  if (body.middle_name !== undefined) allowed.middle_name = (body.middle_name || '').trim().slice(0, 100) || null;
  if (body.last_name  !== undefined) allowed.last_name  = (body.last_name  || '').trim().slice(0, 100);
  if (body.employee_id !== undefined) allowed.employee_id = (body.employee_id || '').trim() || null;
  if (body.phone      !== undefined) allowed.phone      = (body.phone      || '').trim().slice(0, 50);
  if (body.department !== undefined) allowed.department = (body.department || '').trim().slice(0, 200);
  if (body.job_title  !== undefined) allowed.job_title  = (body.job_title  || '').trim().slice(0, 200);
  if (body.role_id    !== undefined) allowed.role_id    = isValidUUID(body.role_id) ? body.role_id : null;

  if (Object.keys(allowed).length === 0) return errorResponse('No valid fields to update', 400);

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(allowed)
    .eq('id', id)
    .eq('is_deleted', false)
    .select('*, roles(id, name)')
    .single();

  if (updateError || !profile) return errorResponse('User not found', 404);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'user.update',
    module: 'users',
    targetId: id,
    targetEmail: profile.email,
    details: allowed,
    ipAddress, userAgent,
  });

  return successResponse({ user: profile });
}

export async function DELETE(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid user ID', 400);

  if (id === user.id) return errorResponse('You cannot delete your own account', 403);

  const { data: profile, error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('email')
    .single();

  if (dbError || !profile) return errorResponse('User not found', 404);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'user.delete',
    module: 'users',
    targetId: id,
    targetEmail: profile.email,
    ipAddress, userAgent,
  });

  return successResponse({ message: 'User deleted successfully' });
}
