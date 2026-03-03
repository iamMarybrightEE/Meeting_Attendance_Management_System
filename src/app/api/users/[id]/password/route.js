import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function PATCH(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid user ID', 400);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const newPassword = body.new_password || '';
  if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
    return errorResponse('New password must be 8–128 characters', 400);
  }

  const isSelf = id === user.id;

  if (isSelf) {
    const currentPassword = body.current_password || '';
    if (!currentPassword) return errorResponse('Current password is required', 400);

    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) return errorResponse('Current password is incorrect', 401);
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: newPassword,
  });

  if (updateError) return errorResponse(updateError.message);

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', id)
    .single();

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: isSelf ? 'password.change' : 'password.reset',
    module: 'users',
    targetId: id,
    targetEmail: target?.email,
    ipAddress, userAgent,
  });

  return successResponse({ message: 'Password updated successfully' });
}
