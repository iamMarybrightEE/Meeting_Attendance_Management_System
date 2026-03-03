import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function PATCH(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid user ID', 400);

  if (id === user.id) return errorResponse('You cannot change your own account status', 403);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
  const status = validStatuses.includes(body.status) ? body.status : null;
  if (!status) return errorResponse('Invalid status. Must be one of: active, inactive, suspended, pending', 400);

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('email, status')
    .single();

  if (updateError || !profile) return errorResponse('User not found', 404);

  if (status === 'suspended' || status === 'inactive') {
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: status === 'suspended' ? '876000h' : '0s',
    }).catch(() => {});
  } else if (status === 'active') {
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: '0s',
    }).catch(() => {});
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: `user.status.${status}`,
    module: 'users',
    targetId: id,
    targetEmail: profile.email,
    details: { new_status: status },
    ipAddress, userAgent,
  });

  return successResponse({ user: profile });
}
