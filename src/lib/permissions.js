/**
 * Permission and role utilities for the Meeting Attendance Management System
 */

// Role definitions
export const ROLES = {
  SYSTEM_ADMIN: 'System Administrator',
  ADMIN: 'Admin',
  CHAIRPERSON: 'Chairperson',
  STAFF: 'Staff'
};

// Check if user is system administrator
export function isSystemAdmin(user) {
  return user?.role === ROLES.SYSTEM_ADMIN;
}

// Check if user is department admin
export function isAdmin(user) {
  return user?.role === ROLES.ADMIN || isSystemAdmin(user);
}

// Check if user is chairperson
export function isChairperson(user) {
  return user?.role === ROLES.CHAIRPERSON;
}

// Check if user can access user management (system admin only)
export function canAccessUserManagement(user) {
  return isSystemAdmin(user);
}

// Check if user can access roles management (system admin only)
export function canAccessRolesManagement(user) {
  return isSystemAdmin(user);
}

// Check if user can access audit logs (system admin only)
export function canAccessAuditLogs(user) {
  return isSystemAdmin(user);
}

// Check if user can access system overview/dashboard (system admin only)
export function canAccessSystemOverview(user) {
  return isSystemAdmin(user);
}

// Check if user can view other profiles
export function canViewProfile(user, targetUserId, targetUserDepartment) {
  if (!user || !targetUserId) return false;
  
  // User can always view their own profile
  if (user.id === targetUserId) return true;
  
  // System admin can view everyone
  if (isSystemAdmin(user)) return true;
  
  // Admins can view their department members
  if (isAdmin(user) && user.department === targetUserDepartment) return true;
  
  return false;
}

// Check if user can edit own profile
export function canEditOwnProfile(user) {
  return user?.id;
}

// Check if user can edit another profile (admin only)
export function canEditProfile(user, targetUserId) {
  if (!user) return false;
  // Users cannot edit other profiles, only admins
  return isSystemAdmin(user) ;
}

// Check if meeting organizer is the current user
export function isCurrentUserMeetingChairperson(user, meeting) {
  if (!user || !meeting) return false;
  return meeting.chairperson_id === user.id || meeting.organizer_id === user.id;
}

// Check if user can confirm attendance
export function canConfirmAttendance(user, meeting) {
  if (!user || !meeting) return false;
  
  // Chairperson/organizer can confirm
  if (isCurrentUserMeetingChairperson(user, meeting)) return true;
  
  // Department admin can confirm for their department meetings
  if (isAdmin(user) && meeting.department_id === user.department) return true;
  
  // System admin can confirm any meeting
  if (isSystemAdmin(user)) return true;
  
  return false;
}

// Check if user can view/access attendance confirmation link
export function canAccessAttendanceConfirmation(user, meeting) {
  if (!user || !meeting) return false;
  
  // Chairperson/organizer can access
  if (isCurrentUserMeetingChairperson(user, meeting)) return true;
  
  // Admin or System admin can access for any meeting
  if (isAdmin(user)) return true;
  
  return false;
}

// Check if user can manage meeting
export function canManageMeeting(user, meeting) {
  if (!user || !meeting) return false;
  
  // Meeting organizer can manage their meeting
  if (isCurrentUserMeetingChairperson(user, meeting)) return true;
  
  // Department admin can manage meetings in their department
  if (isAdmin(user) && meeting.department_id === user.department) return true;
  
  // System admin can manage any meeting
  if (isSystemAdmin(user)) return true;
  
  return false;
}

// Check if user can download attendance report
export function canDownloadAttendanceReport(user, meeting) {
  if (!user || !meeting) return false;
  
  // Chairperson/organizer can download
  if (isCurrentUserMeetingChairperson(user, meeting)) return true;
  
  // Department admin can download for their department
  if (isAdmin(user) && meeting.department_id === user.department) return true;
  
  // System admin can download any
  if (isSystemAdmin(user)) return true;
  
  return false;
}

// Check if user can view meeting (all authenticated users can)
export function canViewMeeting(user, meeting) {
  return !!user && !!meeting;
}

// Get navigation items based on role
export function getNavigationItems(user) {
  const baseItems = [
    { icon: 'Dashboard', label: 'Meetings', path: '/meetings' },
    { icon: 'Assessment', label: 'Reports', path: '/reports' },
    { icon: 'Notifications', label: 'Notifications', path: '/notifications' },
    { icon: 'AccountCircle', label: 'Profile', path: '/user-profile' },
  ];
  
  const adminItems = [
    { icon: 'Dashboard', label: 'System Overview', path: '/dashboard' },
    { icon: 'People', label: 'User Management', path: '/user-management' },
    { icon: 'AdminPanelSettings', label: 'Roles & Permissions', path: '/roles' },
    { icon: 'Assignment', label: 'Audit Logs', path: '/audit-logs' },
  ];
  
  if (isSystemAdmin(user)) {
    return [...adminItems, ...baseItems];
  }
  
  return baseItems;
}

// Check if page should be accessible to user
export function canAccessPage(user, pagePath) {
  if (!user) return pagePath === '/'; // Only home page for non-authenticated
  
  const adminPages = ['/user-management', '/roles', '/audit-logs', '/dashboard'];
  
  // Non-system admins cannot access admin pages
  if (adminPages.includes(pagePath) && !isSystemAdmin(user)) {
    return false;
  }
  
  return true;
}

// Get list of meetings visible to user
export function getMeetingsFilterForUser(user) {
  if (!user) return null;
  
  if (isSystemAdmin(user)) {
    // System admin sees all meetings
    return {};
  }
  
  if (isAdmin(user)) {
    // Admin sees meetings from their department
    return { department: user.department };
  }
  
  // Staff can see meetings they're invited to or are organizer of
  return { user_id: user.id };
}

// Get user's chaired meetings
export function getUserChairedMeetings(meetings, userId) {
  if (!meetings || !userId) return [];
  return meetings.filter(m => (m.chairperson_user_id === userId) || (m.organizer_id?.id === userId));
}
