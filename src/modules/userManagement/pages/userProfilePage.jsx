"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  LockReset,
  Email,
  Phone,
  Badge,
  Business,
  AccessTime,
  CalendarMonth,
  CheckCircle,
  Cancel,
  Warning,
} from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { ACCOUNT_STATUS } from "../../../data/dummyData";
import UserEditModal from "../forms/userEditModal";
import ResetPasswordModal from "../forms/resetPasswordModal";

function getStatusChip(status) {
  const map = {
    [ACCOUNT_STATUS.ACTIVE]: { label: "Active", bgcolor: "#e6f9ee", color: "#018e11" },
    [ACCOUNT_STATUS.INACTIVE]: { label: "Inactive", bgcolor: "#f5f5f5", color: "#6c757d" },
    [ACCOUNT_STATUS.SUSPENDED]: { label: "Suspended", bgcolor: "#fff3cd", color: "#856404" },
    [ACCOUNT_STATUS.LOCKED]: { label: "Locked", bgcolor: "#fde8e8", color: "#f74a4d" },
  };
  return map[status] || { label: status, bgcolor: "#f5f5f5", color: "#555" };
}

function getRoleColor(role) {
  const map = { "System Administrator": "#004497", Admin: "#1c56a3", Chairperson: "#4f88c3", Staff: "#6c757d" };
  return map[role] || "#6c757d";
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function InfoRow({ icon, label, value }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 1.2, borderBottom: "1px solid #f3f4f6", alignItems: "flex-start" }}>
      <Box sx={{ color: "#004497", mt: 0.1, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: "0.7rem", display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500, fontSize: "0.85rem", mt: 0.2 }}>{value || "—"}</Typography>
      </Box>
    </Box>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { users } = useAuth();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const user = users.find((u) => u.id === params.id);

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">User not found</Typography>
        <Button onClick={() => router.push("/user-management")} sx={{ mt: 2 }}>Back to User Management</Button>
      </Box>
    );
  }

  const statusStyle = getStatusChip(user.status);
  const roleColor = getRoleColor(user.role);
  const totalAttendance = user.attendanceStats.present + user.attendanceStats.excused + user.attendanceStats.missed;
  const attendanceRate = totalAttendance > 0 ? Math.round((user.attendanceStats.present / totalAttendance) * 100) : 0;

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push("/user-management")}
        sx={{ mb: 2.5, textTransform: "none", color: "#6b7280", "&:hover": { color: "#004497" } }}
      >
        Back to User Management
      </Button>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, gap: 2.5 }}>
        {/* Profile Sidebar */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Profile Card */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
            {/* Cover */}
            <Box
              sx={{
                height: 80,
                background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}aa 100%)`,
              }}
            />
            {/* Avatar */}
            <Box sx={{ px: 2.5, pb: 2.5, position: "relative" }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: roleColor,
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  border: "3px solid #fff",
                  mt: -4.5,
                  mb: 1.5,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {getInitials(user.firstName, user.lastName)}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 }}>
                {user.firstName} {user.middleName} {user.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>@{user.username}</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip label={user.role} size="small" sx={{ bgcolor: `${roleColor}15`, color: roleColor, fontWeight: 700, borderRadius: "6px", fontSize: "0.72rem" }} />
                <Chip label={statusStyle.label} size="small" sx={{ bgcolor: statusStyle.bgcolor, color: statusStyle.color, fontWeight: 700, borderRadius: "6px", fontSize: "0.72rem" }} />
              </Box>
            </Box>
            <Divider />
            <Box sx={{ p: 2, display: "flex", gap: 1 }}>
              <Button
                startIcon={<Edit />}
                size="small"
                fullWidth
                variant="outlined"
                onClick={() => setEditOpen(true)}
                sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555", "&:hover": { borderColor: "#004497", color: "#004497" } }}
              >
                Edit
              </Button>
              <Button
                startIcon={<LockReset />}
                size="small"
                fullWidth
                variant="outlined"
                onClick={() => setResetPasswordOpen(true)}
                sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555", "&:hover": { borderColor: "#FFB236", color: "#856404" } }}
              >
                Reset Pass
              </Button>
            </Box>
          </Paper>

          {/* Contact Info */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1 }}>Contact Information</Typography>
            <InfoRow icon={<Email sx={{ fontSize: 18 }} />} label="Email" value={user.email} />
            <InfoRow icon={<Phone sx={{ fontSize: 18 }} />} label="Phone" value={user.contact} />
            <InfoRow icon={<Badge sx={{ fontSize: 18 }} />} label="Employee ID" value={user.employeeId} />
            <InfoRow icon={<Business sx={{ fontSize: 18 }} />} label="Department" value={user.department} />
            <InfoRow icon={<CalendarMonth sx={{ fontSize: 18 }} />} label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"} />
            <InfoRow icon={<AccessTime sx={{ fontSize: 18 }} />} label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"} />
          </Paper>

          {/* Attendance Stats */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1.5 }}>Attendance Overview</Typography>
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.82rem" }}>Attendance Rate</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: attendanceRate >= 75 ? "#018e11" : "#f74a4d" }}>{attendanceRate}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={attendanceRate}
                sx={{ height: 6, borderRadius: 3, bgcolor: "#f3f4f6", "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: attendanceRate >= 75 ? "#018e11" : "#f74a4d" } }}
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
              {[
                { label: "Present", value: user.attendanceStats.present, color: "#018e11", icon: <CheckCircle sx={{ fontSize: 14 }} /> },
                { label: "Excused", value: user.attendanceStats.excused, color: "#FFB236", icon: <Warning sx={{ fontSize: 14 }} /> },
                { label: "Missed", value: user.attendanceStats.missed, color: "#f74a4d", icon: <Cancel sx={{ fontSize: 14 }} /> },
              ].map((s) => (
                <Box key={s.label} sx={{ p: 1, borderRadius: 2, bgcolor: `${s.color}12`, textAlign: "center" }}>
                  <Box sx={{ color: s.color, display: "flex", justifyContent: "center" }}>{s.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: s.color, fontSize: "1rem", lineHeight: 1 }}>{s.value}</Typography>
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.65rem" }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Main Content */}
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                px: 2,
                borderBottom: "1px solid #e8edf3",
                "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem" },
                "& .Mui-selected": { color: "#004497", fontWeight: 700 },
                "& .MuiTabs-indicator": { bgcolor: "#004497" },
              }}
            >
              <Tab label="Login History" />
              <Tab label="Account Details" />
            </Tabs>

            {/* Login History */}
            {tab === 0 && (
              <Box sx={{ p: 2.5 }}>
                {user.loginHistory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>No login history available</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                          {["Timestamp", "IP Address", "Status"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.2 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {user.loginHistory.map((log, i) => (
                          <TableRow key={i} sx={{ "&:hover": { bgcolor: "#f8faff" } }}>
                            <TableCell sx={{ py: 1.2 }}>
                              <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                                {new Date(log.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "#f3f4f6", px: 1, py: 0.3, borderRadius: 1 }}>{log.ip}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={log.status} size="small" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: log.status === "success" ? "#e6f9ee" : "#fde8e8", color: log.status === "success" ? "#018e11" : "#f74a4d", borderRadius: "5px" }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Account Details */}
            {tab === 1 && (
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  {[
                    { label: "Full Name", value: `${user.firstName} ${user.middleName || ""} ${user.lastName}`.trim() },
                    { label: "Username", value: user.username },
                    { label: "Email", value: user.email },
                    { label: "Employee ID", value: user.employeeId },
                    { label: "Contact", value: user.contact },
                    { label: "Department", value: user.department },
                    { label: "Role", value: user.role },
                    { label: "Account Status", value: user.status },
                    { label: "Account Created", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
                    { label: "Last Login", value: user.lastLogin ? new Date(user.lastLogin).toLocaleString("en-GB") : "Never" },
                  ].map((item) => (
                    <Box key={item.label} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e8edf3" }}>
                      <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#374151", mt: 0.3 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      <UserEditModal open={editOpen} onClose={() => setEditOpen(false)} user={user} onSuccess={() => {}} />
      <ResetPasswordModal open={resetPasswordOpen} onClose={() => setResetPasswordOpen(false)} user={user} />
    </Box>
  );
}
