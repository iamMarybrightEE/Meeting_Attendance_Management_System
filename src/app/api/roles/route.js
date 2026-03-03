import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { data, error: dbError } = await supabaseAdmin
    .from('roles')
    .select(`
      id, name, description, created_at,
      role_permissions ( permissions ( id, module, action, description ) )
    `)
    .eq('is_deleted', false)
    .order('name');

  if (dbError) return errorResponse(dbError.message);

  return successResponse({ roles: data });
}

export async function POST(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const name        = (body.name        || '').trim().slice(0, 100);
  const description = (body.description || '').trim().slice(0, 500);

  if (!name) return errorResponse('Role name is required', 400);

  const { data: role, error: dbError } = await supabaseAdmin
    .from('roles')
    .insert({ name, description: description || null })
    .select()
    .single();

  if (dbError) {
    const msg = dbError.message.includes('unique') ? 'A role with this name already exists' : dbError.message;
    return errorResponse(msg, 409);
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'role.create',
    module: 'roles',
    targetId: role.id,
    details: { name },
    ipAddress, userAgent,
  });

  return successResponse({ role }, 201);
}
