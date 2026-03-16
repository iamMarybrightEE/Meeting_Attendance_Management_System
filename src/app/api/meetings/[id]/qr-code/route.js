import { verifyAuth, unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/authMiddleware';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit, getActorInfo, getRequestMeta } from '@/lib/auditLog';
import { generateQRCodeData } from '@/lib/qrCodeGenerator';

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  // Check if meeting exists and user is organizer
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, organizer_id, status')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (meetingError || !meeting) return errorResponse('Meeting not found', 404);

  if (meeting.organizer_id !== user.id) {
    return forbiddenResponse('Only meeting organizer can generate QR code');
  }

  if (meeting.status !== 'scheduled') {
    return errorResponse('QR code can only be generated for scheduled meetings', 400);
  }

  // Generate QR code data
  const qrCodeData = generateQRCodeData(id, 'attendance');
  const externalQrData = generateQRCodeData(id, 'external');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8); // 8-hour expiry

  // Create QR code records
  const { data: qrCodes, error: qrError } = await supabaseAdmin
    .from('qr_codes')
    .insert([
      {
        meeting_id: id,
        code_data: qrCodeData,
        code_type: 'attendance',
        is_active: true,
        expires_at: expiresAt.toISOString(),
      },
      {
        meeting_id: id,
        code_data: externalQrData,
        code_type: 'external',
        is_active: true,
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select();

  if (qrError) return errorResponse(qrError.message);

  // Update meeting with QR code data
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('meetings')
    .update({
      qr_code: qrCodeData,
      status: 'ongoing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) return errorResponse(updateError.message);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'meeting.start',
    module: 'meetings',
    targetId: id,
    details: { qr_code_generated: true },
    ipAddress, userAgent,
  });

  return successResponse({
    meeting: updated,
    qr_codes: qrCodes,
  });
}

export async function DELETE(request, { params }) {
  const { user, error } = await verifyAuth(request);
  if (error) return unauthorizedResponse(error);

  const { id } = await params;
  if (!id || !isValidUUID(id)) return errorResponse('Invalid meeting ID', 400);

  // Check if meeting exists and user is organizer
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, organizer_id, status')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (meetingError || !meeting) return errorResponse('Meeting not found', 404);

  if (meeting.organizer_id !== user.id) {
    return forbiddenResponse('Only meeting organizer can end meeting');
  }

  if (meeting.status !== 'ongoing') {
    return errorResponse('Only ongoing meetings can be ended', 400);
  }

  // Deactivate QR codes
  await supabaseAdmin
    .from('qr_codes')
    .update({ is_active: false })
    .eq('meeting_id', id);

  // Update meeting status
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('meetings')
    .update({
      status: 'ended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) return errorResponse(updateError.message);

  const { actorId, actorEmail } = getActorInfo(user);
  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    actorId, actorEmail,
    action: 'meeting.end',
    module: 'meetings',
    targetId: id,
    ipAddress, userAgent,
  });

  return successResponse({ meeting: updated });
}
