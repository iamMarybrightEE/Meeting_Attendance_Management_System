import { getSupabaseAdmin } from './supabaseAdmin.js';

export async function logAudit({
  actorId,
  actorEmail,
  action,
  module = 'users',
  targetId = null,
  targetEmail = null,
  details = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const { error } = await getSupabaseAdmin().from('audit_logs').insert({
      actor_id: actorId || null,
      actor_email: actorEmail || null,
      action,
      module,
      target_id: targetId || null,
      target_email: targetEmail || null,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[AuditLog] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error('[AuditLog] Unexpected error:', err.message);
  }
}

export function getActorInfo(user) {
  if (!user) return { actorId: null, actorEmail: null };
  return {
    actorId: user.id,
    actorEmail: user.email,
  };
}

export function getRequestMeta(request) {
  return {
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null,
    userAgent: request.headers.get('user-agent') || null,
  };
}
