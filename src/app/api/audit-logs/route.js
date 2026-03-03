import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0',  10), 0);
  const module = (searchParams.get('module') || '').trim();
  const action = (searchParams.get('action') || '').trim();
  const actorId = searchParams.get('actor_id');
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (module)  query = query.eq('module', module);
  if (action)  query = query.ilike('action', `%${action}%`);
  if (actorId && isValidUUID(actorId)) query = query.eq('actor_id', actorId);
  if (from)    query = query.gte('created_at', from);
  if (to)      query = query.lte('created_at', to);

  const { data, error: dbError, count } = await query;
  if (dbError) return errorResponse(dbError.message);

  return successResponse({ logs: data, total: count, limit, offset });
}
