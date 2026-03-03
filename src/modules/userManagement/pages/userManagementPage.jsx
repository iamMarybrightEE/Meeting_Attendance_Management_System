"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Pagination,
  Skeleton,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  PersonAdd,
  Edit,
  Refresh,
  LockReset,
  Visibility,
  GetApp,
  PictureAsPdf,
  TableChart,
  ExpandMore,
} from "@mui/icons-material";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
import { ACCOUNT_STATUS, DEPARTMENTS } from "../../../data/dummyData";
import UserCreationModal  from "../forms/userCreationModal";
import UserEditModal      from "../forms/userEditModal";
import ResetPasswordModal from "../forms/resetPasswordModal";

const ROWS_PER_PAGE = 8;

function getStatusChip(status) {
  const map = {
    [ACCOUNT_STATUS.ACTIVE]:    { label: "Active",    bgcolor: "#e6f9ee", color: "#018e11" },
    [ACCOUNT_STATUS.INACTIVE]:  { label: "Inactive",  bgcolor: "#f5f5f5", color: "#6c757d" },
    [ACCOUNT_STATUS.SUSPENDED]: { label: "Suspended", bgcolor: "#fff3cd", color: "#856404" },
    [ACCOUNT_STATUS.LOCKED]:    { label: "Locked",    bgcolor: "#fde8e8", color: "#f74a4d" },
  };
  return map[status] || { label: status, bgcolor: "#f5f5f5", color: "#555" };
}

function getRoleChip(role) {
  const map = {
    "System Administrator": { bgcolor: "#e8f0fe", color: "#004497" },
    Admin:                  { bgcolor: "#e0eaff", color: "#1c56a3" },
    Chairperson:            { bgcolor: "#e3f2fd", color: "#0b6cc2" },
    Staff:                  { bgcolor: "#f3f4f6", color: "#4b4c4d" },
  };
  return map[role] || { bgcolor: "#f3f4f6", color: "#555" };
}

function getAvatarColor(role) {
  const map = {
    "System Administrator": "#004497",
    Admin:                  "#1c56a3",
    Chairperson:            "#0b6cc2",
    Staff:                  "#4b4c4d",
  };
  return map[role] || "#6c757d";
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export default function UserManagementPage() {
  const router = useRouter();
  const { users, roles, fetchUsers } = useAuth();

  const [tab, setTab]           = useState(0);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);

  const [createModalOpen, setCreateModalOpen]       = useState(false);
  const [editModalOpen, setEditModalOpen]           = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser]             = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showSnackbar = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const [exportAnchor, setExportAnchor] = useState(null);

  // Load users on mount
  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    if (tab === 1) filtered = filtered.filter((u) => u.status === ACCOUNT_STATUS.ACTIVE);
    else if (tab === 2) filtered = filtered.filter((u) => u.status !== ACCOUNT_STATUS.ACTIVE);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName?.toLowerCase().includes(q)  ||
          u.lastName?.toLowerCase().includes(q)   ||
          u.email?.toLowerCase().includes(q)      ||
          u.username?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "All") filtered = filtered.filter((u) => u.role === roleFilter);
    if (deptFilter !== "All") filtered = filtered.filter((u) => u.department === deptFilter);
    return filtered;
  }, [users, tab, search, roleFilter, deptFilter]);

  const totalPages    = Math.ceil(filteredUsers.length / ROWS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const activeCount   = users.filter((u) => u.status === ACCOUNT_STATUS.ACTIVE).length;
  const inactiveCount = users.filter((u) => u.status !== ACCOUNT_STATUS.ACTIVE).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const exportCSV = () => {
    const headers = ["Employee ID", "First Name", "Last Name", "Email", "Department", "Role", "Status", "Last Login"];
    const rows = filteredUsers.map((u) => [
      u.employeeId || "",
      u.firstName || "",
      u.lastName  || "",
      u.email     || "",
      u.department || "",
      u.role      || "",
      u.status    || "",
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-GB") : "Never",
    ]);
    const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportAnchor(null);
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    const tableRows = filteredUsers.map((u) => `
      <tr>
        <td>${u.employeeId || "—"}</td>
        <td>${u.firstName} ${u.lastName}</td>
        <td>${u.email}</td>
        <td>${u.department || "—"}</td>
        <td>${u.role || "—"}</td>
        <td>${u.status}</td>
        <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-GB") : "Never"}</td>
      </tr>
    `).join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Users Export</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
          h2 { color: #004497; margin-bottom: 8px; }
          p { color: #6b7280; margin-bottom: 16px; font-size: 11px; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #004497; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
          td { border-bottom: 1px solid #e8edf3; padding: 7px 10px; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h2>URA MAMS — User List</h2>
        <p>Exported on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} &nbsp;|&nbsp; ${filteredUsers.length} users</p>
        <table>
          <thead>
            <tr>
              <th>Employee ID</th><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Last Login</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setExportAnchor(null);
  };

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage system users, roles, and account access
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            startIcon={<GetApp />}
            endIcon={<ExpandMore />}
            variant="outlined"
            size="small"
            onClick={(e) => setExportAnchor(e.currentTarget)}
            sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555", "&:hover": { borderColor: "#004497", color: "#004497" } }}
          >
            Export
          </Button>
          <MuiMenu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160 } }}
          >
            <MuiMenuItem onClick={exportCSV} sx={{ gap: 1.5, fontSize: "0.85rem" }}>
              <TableChart sx={{ fontSize: 18, color: "#018e11" }} /> Export CSV
            </MuiMenuItem>
            <MuiMenuItem onClick={exportPDF} sx={{ gap: 1.5, fontSize: "0.85rem" }}>
              <PictureAsPdf sx={{ fontSize: 18, color: "#f74a4d" }} /> Export PDF
            </MuiMenuItem>
          </MuiMenu>
          <Button
            startIcon={<PersonAdd />}
            variant="contained"
            onClick={() => setCreateModalOpen(true)}
            sx={{
              borderRadius: 2, textTransform: "none", fontWeight: 600,
              background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
              boxShadow: "0 4px 12px rgba(0,68,151,0.3)",
              "&:hover": { background: "linear-gradient(135deg, #003380, #1549a0)", boxShadow: "0 6px 16px rgba(0,68,151,0.4)", transform: "translateY(-1px)" },
              transition: "all 0.2s",
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
          { label: "Total Users",             value: users.length,                                                               color: "#004497", bg: "#f0f4ff" },
          { label: "Active",                  value: activeCount,                                                                color: "#018e11", bg: "#e6f9ee" },
          { label: "Inactive / Suspended",    value: inactiveCount,                                                              color: "#f74a4d", bg: "#fde8e8" },
          { label: "Admins",                  value: users.filter(u => u.role === "System Administrator" || u.role === "Admin").length, color: "#1c56a3", bg: "#e0eaff" },
        ].map((stat) => (
          <Paper
            key={stat.label}
            elevation={0}
            sx={{
              p: 2, borderRadius: 2.5, bgcolor: stat.bg, border: `1px solid ${stat.color}22`,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography variant="caption" sx={{ color: "#555", fontWeight: 500, mt: 0.5, display: "block" }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Main Table Card */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        {/* Toolbar */}
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9ca3af", fontSize: 20 }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 220, maxWidth: 340, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
          />

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: "0.82rem" }}>Role</InputLabel>
              <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} label="Role" sx={{ borderRadius: 2, fontSize: "0.82rem", bgcolor: "#f9fafb" }}>
                <MenuItem value="All">All Roles</MenuItem>
                {roles.map((r) => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ fontSize: "0.82rem" }}>Department</InputLabel>
              <Select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} label="Department" sx={{ borderRadius: 2, fontSize: "0.82rem", bgcolor: "#f9fafb" }}>
                <MenuItem value="All">All Departments</MenuItem>
                {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="small" sx={{ color: "#9ca3af", "&:hover": { color: "#004497" } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(1); }}
          sx={{
            px: 2, borderBottom: "1px solid #e8edf3",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem", minHeight: 44 },
            "& .Mui-selected": { color: "#004497", fontWeight: 600 },
            "& .MuiTabs-indicator": { bgcolor: "#004497" },
          }}
        >
          <Tab label={`All Users (${users.length})`} />
          <Tab label={`Active (${activeCount})`} />
          <Tab label={`Inactive / Suspended (${inactiveCount})`} />
        </Tabs>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["User", "Employee ID", "Department", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5, whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton variant="text" animation="wave" height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginatedUsers.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                      <Typography variant="body2" color="text.secondary">No users found matching your criteria</Typography>
                    </TableCell>
                  </TableRow>
                )
                : paginatedUsers.map((user, idx) => {
                    const statusStyle = getStatusChip(user.status);
                    const roleStyle   = getRoleChip(user.role);
                    return (
                      <TableRow
                        key={user.id}
                        sx={{
                          "&:hover": { bgcolor: "#f8faff" },
                          transition: "background 0.15s",
                          animation: `fadeIn 0.3s ease ${idx * 0.04}s both`,
                          "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                        }}
                      >
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: getAvatarColor(user.role), fontSize: "0.72rem", fontWeight: 700 }}>
                              {getInitials(user.firstName, user.lastName)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: "#1a1a2e", fontSize: "0.82rem", cursor: "pointer", "&:hover": { color: "#004497", textDecoration: "underline" } }}
                                onClick={() => router.push(`/user-profile/${user.id}`)}
                              >
                                {user.firstName} {user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: "0.78rem", color: user.employeeId ? "#374151" : "#9ca3af", fontFamily: user.employeeId ? "monospace" : "inherit" }}>
                            {user.employeeId || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "#374151" }}>{user.department || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.role || "—"}
                            size="small"
                            sx={{ bgcolor: roleStyle.bgcolor, color: roleStyle.color, fontWeight: 600, fontSize: "0.7rem", height: 22, borderRadius: "5px" }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusStyle.label}
                            size="small"
                            sx={{ bgcolor: statusStyle.bgcolor, color: statusStyle.color, fontWeight: 600, fontSize: "0.7rem", height: 22, borderRadius: "5px" }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                            {formatDate(user.lastLogin)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="View Profile">
                              <IconButton size="small" onClick={() => router.push(`/user-profile/${user.id}`)} sx={{ color: "#6b7280", "&:hover": { color: "#004497", bgcolor: "#f0f4ff" } }}>
                                <Visibility sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit User">
                              <IconButton size="small" onClick={() => { setSelectedUser(user); setEditModalOpen(true); }} sx={{ color: "#6b7280", "&:hover": { color: "#1c56a3", bgcolor: "#e0eaff" } }}>
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reset Password">
                              <IconButton size="small" onClick={() => { setSelectedUser(user); setResetPasswordModalOpen(true); }} sx={{ color: "#6b7280", "&:hover": { color: "#FFB236", bgcolor: "#fff3cd" } }}>
                                <LockReset sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="caption" color="text.secondary">
              Showing {Math.min((page - 1) * ROWS_PER_PAGE + 1, filteredUsers.length)}–{Math.min(page * ROWS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
            </Typography>
            <Pagination
              count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small"
              sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 }, "& .Mui-selected": { bgcolor: "#004497", color: "#fff" } }}
            />
          </Box>
        )}
      </Paper>

      {/* Modals */}
      <UserCreationModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => showSnackbar("User created successfully!")}
      />
      <UserEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={selectedUser}
        onSuccess={() => showSnackbar("User updated successfully!")}
      />
      <ResetPasswordModal
        open={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        user={selectedUser}
      />

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
