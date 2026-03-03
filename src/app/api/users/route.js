import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0',  10), 0);
  const search = (searchParams.get('search') || '').trim();
  const status = searchParams.get('status');
  const roleId = searchParams.get('role_id');

  let query = supabaseAdmin
    .from('profiles')
    .select(`
      id, first_name, last_name, email, phone, department,
      job_title, avatar_url, status, last_login, created_at, updated_at,
      roles ( id, name )
    `, { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (status && ['active', 'inactive', 'suspended', 'pending'].includes(status)) {
    query = query.eq('status', status);
  }
  if (roleId && isValidUUID(roleId)) {
    query = query.eq('role_id', roleId);
  }

  const { data, error: dbError, count } = await query;
  if (dbError) return errorResponse(dbError.message);

  return successResponse({ users: data, total: count, limit, offset });
}

export async function POST(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Invalid JSON body', 400); }

  const email      = (body.email || '').trim().toLowerCase();
  const password   = body.password || '';
  const first_name = (body.first_name || '').trim().slice(0, 100);
  const last_name  = (body.last_name  || '').trim().slice(0, 100);
  const phone      = (body.phone      || '').trim().slice(0, 50);
  const department = (body.department || '').trim().slice(0, 200);
  const job_title  = (body.job_title  || '').trim().slice(0, 200);
  const role_id    = isValidUUID(body.role_id) ? body.role_id : null;
  const status     = ['active', 'inactive', 'suspended', 'pending'].includes(body.status) ? body.status : 'active';

  if (!first_name || !last_name) return errorResponse('First name and last name are required', 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('Valid email address is required', 400);
  if (!password || password.length < 8 || password.length > 128) return errorResponse('Password must be 8–128 characters', 400);

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name },
  });

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'A user with this email already exists'
      : authError.message;
    return errorResponse(msg, 409);
  }

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ first_name, last_name, phone, department, job_title, role_id, status, created_by: user.id })
    .eq('id', authData.user.id)
    .select('*, roles(id, name)')
    .single();

  if (updateError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return errorResponse(updateError.message);
  }

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'user.create',
    module: 'users',
    targetId: authData.user.id,
    targetEmail: email,
    details: { role_id, department },
    ipAddress, userAgent,
  });

  return successResponse({ user: profile }, 201);
}
