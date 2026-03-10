// Meetings module permission utilities
import { MEETINGS_PERMISSIONS, ROLES } from '@/data/dummyData';

export const userHasPermission = (userRole, permission) => {
  const rolePermissions = MEETINGS_PERMISSIONS[userRole];
  if (!rolePermissions) return false;
  return rolePermissions[permission] === true;
};

export const userCanScheduleMeeting = (userRole) =>
  userHasPermission(userRole, 'CanScheduleMeeting');

export const userCanEditMeeting = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanEditMeeting')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanCancelMeeting = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanCancelMeeting')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanDeleteMeeting = (userRole) =>
  userHasPermission(userRole, 'CanDeleteMeeting');

export const userCanStartMeeting = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanStartMeeting')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanEndMeeting = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanEndMeeting')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanViewAllMeetings = (userRole) =>
  userHasPermission(userRole, 'CanViewAllMeetings');

export const userCanViewMeeting = (userRole, meeting, userId) => {
  if (userCanViewAllMeetings(userRole)) return true;
  if (meeting.createdById === userId || meeting.attendeeIds.includes(userId)) {
    return true;
  }
  if (
    meeting.chairpersonId === userId &&
    (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson')
  ) {
    return true;
  }
  return false;
};

export const userCanViewDepartmentMeetings = (userRole) =>
  userHasPermission(userRole, 'CanViewDepartmentMeetings');

export const userCanSendNotifications = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanSendNotifications')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanInviteUsers = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanInviteUsersToMeeting')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanRemoveUsers = (userRole, meeting, userId) => {
  if (!userHasPermission(userRole, 'CanRemoveUsersFromMeeting')) return false;
  if (userRole === ROLES.CHAIRPERSON || userRole === 'Chairperson') {
    return meeting.chairpersonId === userId;
  }
  return true;
};

export const userCanConfirmAttendance = (userRole, meeting, userId) => {
  // Any user can confirm their own attendance
  return meeting.attendeeIds.includes(userId);
};

export const userCanValidateAppeals = (userRole, appeal, userId) => {
  if (!userHasPermission(userRole, 'CanValidateAppeals')) return false;
  // Staff cannot validate appeals
  if (userRole === ROLES.STAFF || userRole === 'Staff') return false;
  return true;
};

export const userCanViewReports = (userRole, userId) => {
  // All users can view their own reports
  return true;
};

export const userCanExportReports = (userRole) => {
  if (userRole === ROLES.STAFF || userRole === 'Staff') return false;
  return userHasPermission(userRole, 'CanExportReports');
};

export const userHasAccessToMeeting = (userRole, meeting, userId) => {
  if (userRole === ROLES.SYSTEM_ADMIN || userRole === 'System Administrator') {
    return true;
  }
  return userCanViewMeeting(userRole, meeting, userId);
};
