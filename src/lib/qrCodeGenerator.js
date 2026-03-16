import crypto from 'crypto';

export function generateQRCodeData(meetingId, type = 'attendance') {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex');
  return `${meetingId}:${type}:${timestamp}:${nonce}`;
}

export function generateRegistrationToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function generateQRCodeURL(baseURL, meetingId, token) {
  const params = new URLSearchParams({
    meeting: meetingId,
    token: token,
  });
  return `${baseURL}/attendance/confirm?${params.toString()}`;
}

export function generateExternalRegistrationURL(baseURL, meetingId, registrationToken) {
  const params = new URLSearchParams({
    meeting: meetingId,
    token: registrationToken,
  });
  return `${baseURL}/external/register?${params.toString()}`;
}
