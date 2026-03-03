import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getRequestMeta } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!password || password.length < 8 || password.length > 128) {
    return new Response(JSON.stringify({ error: 'Password must be 8–128 characters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { user, session } = authData;

  const { data: profile, error: profileError } = await supabaseAdmin
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
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'User profile not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (profile.status !== 'active') {
    return new Response(JSON.stringify({ error: `Account is ${profile.status}. Contact your administrator.` }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update last_login
  await supabaseAdmin
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'auth.login',
    module: 'auth',
    targetId: user.id,
    ipAddress,
    userAgent,
  });

  return new Response(JSON.stringify({ user: profile, session }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
