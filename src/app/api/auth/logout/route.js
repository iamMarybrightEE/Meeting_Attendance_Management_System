import { verifyAuth, unauthorizedResponse, successResponse } from '@/lib/authMiddleware';
import { logAudit, getRequestMeta } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (token) {
    await authClient.auth.admin?.signOut(token).catch(() => {});
  }

  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'auth.logout',
    module: 'auth',
    targetId: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({ message: 'Logged out successfully' });
}
