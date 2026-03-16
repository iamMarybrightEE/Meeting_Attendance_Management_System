import { verifyAuth, unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  const status = searchParams.get('status');

  // Check meeting exists and user has access
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('organizer_id')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (meetingError || !meeting) return errorResponse('Meeting not found', 404);

  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
  const isOrganizer = meeting.organizer_id === user.id;

  if (!isAdmin && !isOrganizer) {
    return forbiddenResponse('Only organizer or admin can view appeals');
  }

  let query = supabaseAdmin
    .from('absence_appeals')
    .select(
      `
        id, meeting_id, user_id, reason, status, review_notes, reviewed_at, created_at,
        profiles:user_id(id, first_name, last_name, email, employee_id),
        reviewer:reviewed_by(id, first_name, last_name, email)
      `,
      { count: 'exact' }
    )
    .eq('meeting_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data: appeals, error: dbError, count } = await query;
  if (dbError) return errorResponse(dbError.message);

  return successResponse({ appeals: appeals || [], total: count || 0, limit, offset });
}

export async function POST(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  let formData;
  try { formData = await request.formData(); }
  catch { return errorResponse('Invalid form data', 400); }

  const reason = formData.get('reason');
  const document = formData.get('document');

  if (!reason || !reason.trim()) {
    return errorResponse('Appeal reason is required', 400);
  }

  // Check if meeting exists and is ended
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, organizer_id')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (meetingError || !meeting) return errorResponse('Meeting not found', 404);

  if (meeting.status !== 'ended') {
    return errorResponse('Appeals can only be submitted after meeting ends', 400);
  }

  // Check if user is marked as missed or pending
  const { data: attendance } = await supabaseAdmin
    .from('meeting_attendees')
    .select('id, status')
    .eq('meeting_id', id)
    .eq('user_id', user.id)
    .single();

  if (!attendance || !['missed', 'pending'].includes(attendance.status)) {
    return errorResponse('Only users marked as missed or pending can appeal', 400);
  }

  // Check if appeal already exists
  const { data: existingAppeal } = await supabaseAdmin
    .from('absence_appeals')
    .select('id')
    .eq('meeting_id', id)
    .eq('user_id', user.id)
    .single();

  if (existingAppeal) {
    return errorResponse('Appeal already submitted for this meeting', 400);
  }

  let documentUrl = null;
  if (document && document.size > 0) {
    try {
      const arrayBuffer = await document.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sanitizedFileName = document.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${sanitizedFileName}`;
      
      // Try to upload to appeal_documents bucket
      const { error: uploadError } = await supabaseAdmin.storage
        .from('appeal_documents')
        .upload(`appeals/${fileName}`, buffer, {
          contentType: document.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.warn('Document upload warning:', uploadError.message);
        // Document upload failed but continue - document is optional
      } else {
        const { data: urlData } = supabaseAdmin.storage
          .from('appeal_documents')
          .getPublicUrl(`appeals/${fileName}`);
        documentUrl = urlData?.publicUrl || null;
      }
    } catch (err) {
      console.warn('Document processing warning:', err.message);
      // Document processing failed but continue - document is optional
    }
  }

  const payload = {
    meeting_id: id,
    user_id: user.id,
    reason: reason.trim().slice(0, 1000),
    document_url: documentUrl,
    status: 'pending',
  };

  const { data: appeal, error: createError } = await supabaseAdmin
    .from('absence_appeals')
    .insert([payload])
    .select('*')
    .single();

  if (createError) return errorResponse(createError.message);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'appeal.submit',
    module: 'meetings',
    targetId: id,
    details: { reason: payload.reason, documentUrl },
    ipAddress, userAgent,
  });

  return successResponse({ appeal }, 201);
}
