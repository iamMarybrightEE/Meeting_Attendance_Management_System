const BASE_URL = '/api';
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mams_access_token');
}

export function setSession(session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mams_access_token', session.access_token);
  localStorage.setItem('mams_refresh_token', session.refresh_token);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mams_access_token');
  localStorage.removeItem('mams_refresh_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

const STATUS_TO_UI = {
  active:    'Active',
  inactive:  'Inactive',
  suspended: 'Suspended',
  pending:   'Pending',
  locked:    'Locked',
};

const STATUS_TO_API = {
  Active:    'active',
  Inactive:  'inactive',
  Suspended: 'suspended',
  Pending:   'pending',
  Locked:    'locked',
};

function normalizeUser(user) {
  if (!user) return null;
  return {
    id:              user.id,
    firstName:       user.first_name  || '',
    lastName:        user.last_name   || '',
    middleName:      user.middle_name || '',
    username:        user.email?.split('@')[0] || '',
    email:           user.email       || '',
    contact:         user.phone       || '',
    department:      user.department  || '',
    job_title:       user.job_title   || '',
    status:          STATUS_TO_UI[user.status] || user.status || 'Active',
    lastLogin:       user.last_login  || null,
    createdAt:       user.created_at  || null,
    updatedAt:       user.updated_at  || null,
    role:            user.roles?.name || '',
    roleId:          user.roles?.id   || user.role_id || '',
    avatar:          user.avatar_url  || null,
    attendanceStats: { present: 0, excused: 0, missed: 0 },
    loginHistory:    [],
    employeeId:      user.employee_id || null,
  };
}

// Transform UI form payload → backend field names 
function denormalizeUser(data) {
  const out = {};
  if (data.firstName   !== undefined) out.first_name   = data.firstName;
  if (data.middleName  !== undefined) out.middle_name  = data.middleName;
  if (data.lastName    !== undefined) out.last_name    = data.lastName;
  if (data.email       !== undefined) out.email        = data.email;
  if (data.password    !== undefined) out.password     = data.password;
  if (data.contact     !== undefined) out.phone        = data.contact;
  if (data.employeeId  !== undefined) out.employee_id  = data.employeeId;
  if (data.department  !== undefined) out.department   = data.department;
  if (data.job_title   !== undefined) out.job_title    = data.job_title;
  if (data.roleId      !== undefined) out.role_id      = data.roleId;
  if (data.status      !== undefined) out.status       = STATUS_TO_API[data.status] || data.status?.toLowerCase();
  return out;
}

const ROLE_COLORS = ['#c0392b', '#b7791f', '#2980b9', '#27ae60', '#8557D3', '#018e11'];

const ROLE_LEVELS = {
  'system administrator': 1,
  'admin': 2,
  'chairperson': 3,
  'staff': 4,
};

const ROLE_DESCRIPTIONS = {
  'system administrator': 'Highest authority with unrestricted access to all system modules and configurations.',
  'admin': 'Elevated privileges for managing staff and operations. Cannot override System Admin authority.',
  'chairperson': 'Meeting-specific elevated privilege. Inherits base role permissions plus meeting chair capabilities.',
  'staff': 'Base user role with limited access. Can view own profile and attend meetings.',
};

/** Transform a backend role row → UI-friendly role object */
export function normalizeRole(role, index = 0) {
  const nameLower = (role.name || '').toLowerCase();
  const permissions = (role.role_permissions || [])
    .map(rp => rp.permissions)
    .filter(Boolean);
  const level = ROLE_LEVELS[nameLower] ?? (index + 1);
  return {
    id:           role.id,
    name:         role.name,
    description:  ROLE_DESCRIPTIONS[nameLower] || role.description || '',
    color:        ROLE_COLORS[(level - 1) % ROLE_COLORS.length],
    level,
    permissionIds: permissions.map(p => p.id),
    permissions,
    userCount:    role.user_count || 0,
    createdAt:    role.created_at || null,
  };
}

// Generate a human-readable description from the action type and details 
function generateDescription(normalizedAction, details, log) {
  const d          = details || {};
  const firstName  = d.first_name || '';
  const lastName   = d.last_name  || '';
  const fullName   = [firstName, lastName].filter(Boolean).join(' ');
  const email      = d.email || log.target_email || '';
  const targetName = fullName || email || '';

  const fieldLabels = {
    first_name: 'first name',
    last_name:  'last name',
    phone:      'phone number',
    department: 'department',
    role_id:    'role',
    email:      'email',
    job_title:  'job title',
    status:     'status',
    avatar_url: 'profile photo',
  };

  switch (normalizedAction) {
    case 'AUTH_LOGIN':
      return 'Logged in successfully';
    case 'AUTH_LOGOUT':
      return 'Logged out';
    case 'AUTH_FAILED':
    case 'AUTH_LOGIN_FAILED':
      return 'Failed login attempt';
    case 'USER_CREATE':
      return targetName
        ? `Created new user account for ${targetName}`
        : 'Created new user account';
    case 'USER_UPDATE': {
      const changedFields = Object.keys(d)
        .filter(k => k !== 'message' && k !== 'description')
        .map(k => fieldLabels[k] || k.replace(/_/g, ' '))
        .filter(Boolean);
      return changedFields.length > 0
        ? `Updated profile: ${changedFields.join(', ')}`
        : 'Updated user profile';
    }
    case 'USER_STATUS_ACTIVE':
      return targetName ? `Activated user account: ${targetName}` : 'Activated user account';
    case 'USER_STATUS_INACTIVE':
      return targetName ? `Deactivated user account: ${targetName}` : 'Deactivated user account';
    case 'USER_STATUS_SUSPENDED':
      return targetName ? `Suspended user account: ${targetName}` : 'Suspended user account';
    case 'USER_STATUS_LOCKED':
      return targetName ? `Locked user account: ${targetName}` : 'Locked user account';
    case 'USER_PERMISSIONS_UPDATE':
      return 'Updated user permissions';
    case 'ROLE_CREATE':
      return d.name ? `Created new role: ${d.name}` : 'Created new role';
    case 'ROLE_UPDATE':
      return d.name ? `Updated role: ${d.name}` : 'Updated role settings';
    case 'ROLE_DELETE':
      return d.name ? `Deleted role: ${d.name}` : 'Deleted a role';
    case 'PASSWORD_CHANGE':
      return 'Changed account password';
    case 'PASSWORD_RESET':
      return 'Reset account password';
    default:
      // Fallback: turn SOME_ACTION into "Some Action"
      return normalizedAction
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
  }
}

// Transform a backend audit log row → UI-friendly log object 
export function normalizeAuditLog(log) {
  const actorEmail       = log.actor_email || '';
  const userName         = actorEmail.split('@')[0] || 'System';
  const rawDetails       = log.details;
  const normalizedAction = (log.action || '').toUpperCase().replace(/\./g, '_');

  // Prefer an explicit message/description in details; otherwise auto-generate
  const description =
    rawDetails?.message ||
    rawDetails?.description ||
    generateDescription(normalizedAction, rawDetails, log);

  return {
    id:          log.id,
    userName,
    userEmail:   actorEmail,
    action:      normalizedAction,
    module:      log.module   || '',
    description: description  || '',
    ipAddress:   log.ip_address || 'N/A',
    status:      (normalizedAction === 'AUTH_FAILED' || normalizedAction === 'AUTH_LOGIN_FAILED') ? 'failed' : 'success',
    timestamp:   log.created_at || new Date().toISOString(),
  };
}

export const authApi = {
  login: async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return { ...data, user: normalizeUser(data.user) };
  },
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  me: async () => {
    const data = await apiFetch('/auth/me');
    return { ...data, user: normalizeUser(data.user) };
  },
};

export const usersApi = {
  list: async (params = {}) => {
    const data = await apiFetch(`/users?${new URLSearchParams(params)}`);
    return { ...data, users: (data.users || []).map(normalizeUser) };
  },
  get: async (id) => {
    const data = await apiFetch(`/users/${id}`);
    return { ...data, user: normalizeUser(data.user) };
  },
  create: async (payload) => {
    const data = await apiFetch('/users', { method: 'POST', body: JSON.stringify(denormalizeUser(payload)) });
    return { ...data, user: normalizeUser(data.user) };
  },
  update: async (id, payload) => {
    const data = await apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(denormalizeUser(payload)) });
    return { ...data, user: normalizeUser(data.user) };
  },
  delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  changeStatus: (id, status) => {
    const apiStatus = STATUS_TO_API[status] || status?.toLowerCase();
    return apiFetch(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: apiStatus }) });
  },
  changePassword:    (id, payload)     => apiFetch(`/users/${id}/password`,    { method: 'PATCH', body: JSON.stringify(payload) }),
  getPermissions:    (id)              => apiFetch(`/users/${id}/permissions`),
  updatePermissions: (id, permissions) => apiFetch(`/users/${id}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions }) }),
};

export const rolesApi = {
  list: async () => {
    const data = await apiFetch('/roles');
    const normalized = (data.roles || []).map((r, i) => normalizeRole(r, i));
    normalized.sort((a, b) => a.level - b.level);
    return { ...data, roles: normalized };
  },
  get:    (id)          => apiFetch(`/roles/${id}`),
  create: (payload)     => apiFetch('/roles',     { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, payload) => apiFetch(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id)          => apiFetch(`/roles/${id}`, { method: 'DELETE' }),
};

export const auditLogsApi = {
  list: async (params = {}) => {
    const data = await apiFetch(`/audit-logs?${new URLSearchParams(params)}`);
    return { ...data, logs: (data.logs || []).map(normalizeAuditLog) };
  },
};
