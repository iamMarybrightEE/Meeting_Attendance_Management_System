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
  if (!id || !isValidUUID(id)) return errorResponse('Invalid role ID', 400);

  const { data, error: dbError } = await supabaseAdmin
    .from('roles')
    .select(`
      id, name, description, created_at,
      role_permissions ( permissions ( id, module, action, description ) )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (dbError || !data) return errorResponse('Role not found', 404);

  return successResponse({ role: data });
}

export async function PATCH(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid role ID', 400);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const updates = {};
  if (body.name        !== undefined) updates.name        = (body.name        || '').trim().slice(0, 100);
  if (body.description !== undefined) updates.description = (body.description || '').trim().slice(0, 500);

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('roles')
      .update(updates)
      .eq('id', id);
    if (updateError) return errorResponse(updateError.message);
  }

  if (Array.isArray(body.permission_ids)) {
    const validIds = body.permission_ids.filter(pid => isValidUUID(pid));

    await supabaseAdmin.from('role_permissions').delete().eq('role_id', id);

    if (validIds.length > 0) {
      const { error: permError } = await supabaseAdmin.from('role_permissions').insert(
        validIds.map(pid => ({ role_id: id, permission_id: pid }))
      );
      if (permError) return errorResponse(permError.message);
    }
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'role.update',
    module: 'roles',
    targetId: id,
    details: updates,
    ipAddress, userAgent,
  });

  const { data: updated } = await supabaseAdmin
    .from('roles')
    .select(`id, name, description, created_at, role_permissions ( permissions ( id, module, action, description ) )`)
    .eq('id', id)
    .single();

  return successResponse({ role: updated });
}

export async function DELETE(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid role ID', 400);

  const { data: role, error: dbError } = await supabaseAdmin
    .from('roles')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('name')
    .single();

  if (dbError || !role) return errorResponse('Role not found', 404);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'role.delete',
    module: 'roles',
    targetId: id,
    details: { name: role.name },
    ipAddress, userAgent,
  });

  return successResponse({ message: 'Role deleted successfully' });
}
