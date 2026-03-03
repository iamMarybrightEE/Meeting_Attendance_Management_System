import { verifyAuth, unauthorizedResponse, successResponse, errorResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

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
    return errorResponse('Profile not found', 404);
  }

  return successResponse({ user: profile });
}
