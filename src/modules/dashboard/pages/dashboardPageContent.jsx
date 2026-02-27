"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Avatar,
  Divider,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  People,
  PersonAdd,
  AdminPanelSettings,
  SupervisorAccount,
  PersonOff,
  CheckCircle,
  Lock,
  TrendingUp,
  ArrowForward,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { ACCOUNT_STATUS, AUDIT_LOGS } from "../../../data/dummyData";

function StatCard({ icon, label, value, color, bg, change }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid #e8edf3",
        background: bg || "#fff",
        transition: "all 0.25s ease",
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
        animation: "slideIn 0.4s ease forwards",
        "@keyframes slideIn": { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "0.8rem", fontWeight: 500, mb: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: color || "#1a1a2e", lineHeight: 1 }}>
            {value}
          </Typography>
          {change && (
            <Typography variant="caption" sx={{ color: "#018e11", display: "flex", alignItems: "center", gap: 0.3, mt: 0.5 }}>
              <TrendingUp sx={{ fontSize: 12 }} /> {change}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ color, "& svg": { fontSize: 22 } }}>{icon}</Box>
        </Box>
      </Box>
    </Paper>
  );
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function getAvatarColor(role) {
  const map = { "System Administrator": "#004497", Admin: "#1c56a3", Chairperson: "#4f88c3", Staff: "#6c757d" };
  return map[role] || "#6c757d";
}

function getActionColor(action) {
  const map = { LOGIN: "#018e11", FAILED_LOGIN: "#f74a4d", CREATE_USER: "#004497", SUSPEND_USER: "#FFB236", LOCK_ACCOUNT: "#f74a4d", ROLE_CHANGE: "#8557D3", PASSWORD_RESET: "#0073ff", DEACTIVATE_USER: "#ff5062", PROFILE_UPDATE: "#6c757d" };
  return map[action] || "#6c757d";
}

export default function DashboardPageContent() {
  const router = useRouter();
  const { users, currentUser } = useAuth();

  const activeUsers = users.filter((u) => u.status === ACCOUNT_STATUS.ACTIVE).length;
  const suspendedUsers = users.filter((u) => u.status === ACCOUNT_STATUS.SUSPENDED).length;
  const lockedUsers = users.filter((u) => u.status === ACCOUNT_STATUS.LOCKED).length;
  const adminUsers = users.filter((u) => u.role === "System Administrator" || u.role === "Admin").length;

  const recentLogs = AUDIT_LOGS.slice(0, 8);

  const roleDistribution = [
    { label: "System Admin", count: users.filter((u) => u.role === "System Administrator").length, color: "#004497" },
    { label: "Admin", count: users.filter((u) => u.role === "Admin").length, color: "#1c56a3" },
    { label: "Chairperson", count: users.filter((u) => u.role === "Chairperson").length, color: "#4f88c3" },
    { label: "Staff", count: users.filter((u) => u.role === "Staff").length, color: "#6c757d" },
  ];

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>
          Welcome back, {currentUser?.firstName} 
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
          Here&apos;s what&apos;s happening in your system today.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2, mb: 3 }}>
        <StatCard icon={<People />} label="Total Users" value={users.length} color="#004497" change="+2 this month" />
        <StatCard icon={<CheckCircle />} label="Active Users" value={activeUsers} color="#018e11" />
        <StatCard icon={<AdminPanelSettings />} label="Admins" value={adminUsers} color="#1c56a3" />
        <StatCard icon={<PersonOff />} label="Suspended" value={suspendedUsers} color="#FFB236" />
        {/* <StatCard icon={<Lock />} label="Locked" value={lockedUsers} color="#f74a4d" /> */}
      </Box>

      {/* Two Column Section */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" }, gap: 2.5, mb: 2.5 }}>
        {/* Recent Activity */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Recent Activity</Typography>
            <Button
              size="small"
              endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
              onClick={() => router.push("/audit-logs")}
              sx={{ textTransform: "none", color: "#004497", fontSize: "0.8rem" }}
            >
              View All
            </Button>
          </Box>
          <Box sx={{ p: 1 }}>
            {recentLogs.map((log, i) => (
              <Box
                key={log.id}
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#f8fafc" },
                  animation: `slideIn 0.3s ease ${i * 0.05}s both`,
                  "@keyframes slideIn": { from: { opacity: 0, transform: "translateX(-6px)" }, to: { opacity: 1, transform: "translateX(0)" } },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: getActionColor(log.action),
                    mt: 0.7,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontSize: "0.82rem", color: "#374151", mb: 0.2 }}>
                    <strong>{log.userName}</strong> — {log.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                      {new Date(log.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                    <Chip
                      label={log.action.replace(/_/g, " ")}
                      size="small"
                      sx={{ height: 16, fontSize: "0.6rem", bgcolor: `${getActionColor(log.action)}18`, color: getActionColor(log.action), fontWeight: 600, borderRadius: "4px" }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Role Distribution */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 2 }}>Role Distribution</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {roleDistribution.map((r) => (
                <Box key={r.label}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 500, color: "#374151" }}>{r.label}</Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 700, color: r.color }}>{r.count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(r.count / users.length) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: `${r.color}18`,
                      "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: r.color },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Quick Actions */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1.5 }}>Quick Actions</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[
                { label: "Manage Users", path: "/user-management", icon: <People sx={{ fontSize: 16 }} /> },
                { label: "Roles & Permissions", path: "/roles", icon: <AdminPanelSettings sx={{ fontSize: 16 }} /> },
                { label: "Audit Logs", path: "/audit-logs", icon: <SupervisorAccount sx={{ fontSize: 16 }} /> },
              ].map((action) => (
                <Button
                  key={action.label}
                  startIcon={action.icon}
                  endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                  onClick={() => router.push(action.path)}
                  variant="outlined"
                  size="small"
                  sx={{
                    justifyContent: "space-between",
                    textTransform: "none",
                    borderRadius: 2,
                    borderColor: "#e8edf3",
                    color: "#374151",
                    py: 1,
                    "&:hover": { borderColor: "#004497", color: "#004497", bgcolor: "#f0f4ff" },
                    transition: "all 0.2s",
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Recent Users */}
      {/* <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Recent Users</Typography>
          <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} onClick={() => router.push("/user-management")} sx={{ textTransform: "none", color: "#004497", fontSize: "0.8rem" }}>
            View All
          </Button>
        </Box>
        <Box sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
          {users.slice(0, 6).map((user, i) => (
            <Box
              key={user.id}
              onClick={() => router.push(`/user-profile/${user.id}`)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid #e8edf3",
                cursor: "pointer",
                flex: "1 1 200px",
                maxWidth: 260,
                "&:hover": { bgcolor: "#f0f4ff", borderColor: "#004497" },
                transition: "all 0.2s",
                animation: `slideIn 0.3s ease ${i * 0.06}s both`,
              }}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: getAvatarColor(user.role), fontSize: "0.75rem", fontWeight: 700 }}>
                {getInitials(user.firstName, user.lastName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem", color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Chip label={user.role} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: getAvatarColor(user.role) + "18", color: getAvatarColor(user.role), fontWeight: 600, borderRadius: "4px" }} />
              </Box>
            </Box>
          ))}
        </Box>
      </Paper> */}
    </Box>
  );
}
