import { verifyAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// GET /api/users/[id]/permissions
// Returns all permissions assigned to the user via their role.
export async function GET(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid user ID', 400);

  const { data: profile, error: dbError } = await supabaseAdmin
    .from('profiles')
    .select(`
      roles (
        id, name,
        role_permissions ( permissions ( id, module, action, description ) )
      )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (dbError || !profile) return errorResponse('User not found', 404);

  const rolePermissions = (profile?.roles?.role_permissions || [])
    .map(rp => rp.permissions)
    .filter(Boolean);

  return successResponse({ role_permissions: rolePermissions });
}
