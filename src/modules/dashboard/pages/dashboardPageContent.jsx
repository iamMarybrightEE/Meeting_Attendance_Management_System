"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Avatar,
  LinearProgress,
} from "@mui/material";
import {
  People,
  AdminPanelSettings,
  SupervisorAccount,
  PersonOff,
  CheckCircle,
  TrendingUp,
  ArrowForward,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { ACCOUNT_STATUS } from "../../../data/dummyData";
import { auditLogsApi } from "../../../lib/apiClient";

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

function getActionColor(action) {
  const map = {
    // Auth
    AUTH_LOGIN:              "#018e11",
    AUTH_LOGOUT:             "#6c757d",
    AUTH_FAILED:             "#f74a4d",
    AUTH_LOGIN_FAILED:       "#f74a4d",
    // User management
    USER_CREATE:             "#004497",
    USER_UPDATE:             "#0073ff",
    USER_STATUS_ACTIVE:      "#018e11",
    USER_STATUS_INACTIVE:    "#6c757d",
    USER_STATUS_SUSPENDED:   "#FFB236",
    USER_STATUS_LOCKED:      "#f74a4d",
    USER_PERMISSIONS_UPDATE: "#8557D3",
    // Roles
    ROLE_CREATE:             "#004497",
    ROLE_UPDATE:             "#8557D3",
    ROLE_DELETE:             "#f74a4d",
    // Password
    PASSWORD_CHANGE:         "#0073ff",
    PASSWORD_RESET:          "#0073ff",
  };
  return map[action] || "#6c757d";
}

export default function DashboardPageContent() {
  const router = useRouter();
  const { users, currentUser, roles } = useAuth();
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    auditLogsApi.list({ limit: 8 })
      .then(({ logs }) => setRecentLogs(logs || []))
      .catch(() => {});
  }, []);

  const activeUsers    = users.filter((u) => u.status === ACCOUNT_STATUS.ACTIVE).length;
  const suspendedUsers = users.filter((u) => u.status === ACCOUNT_STATUS.SUSPENDED).length;
  const adminUsers     = users.filter((u) => u.role === "System Administrator" || u.role === "Admin").length;

  const roleDistribution = roles.map((r) => ({
    label: r.name,
    count: users.filter((u) => u.role === r.name).length,
    color: r.color,
  }));

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
        <StatCard icon={<People />}             label="Total Users"  value={users.length}   color="#004497" change="+2 this month" />
        <StatCard icon={<CheckCircle />}        label="Active Users" value={activeUsers}     color="#018e11" />
        <StatCard icon={<AdminPanelSettings />} label="Admins"       value={adminUsers}      color="#1c56a3" />
        <StatCard icon={<PersonOff />}          label="Suspended"    value={suspendedUsers}  color="#FFB236" />
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
            {recentLogs.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">No recent activity</Typography>
              </Box>
            ) : recentLogs.map((log, i) => (
              <Box
                key={log.id || i}
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
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: getActionColor(log.action), mt: 0.7, flexShrink: 0 }} />
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

        {/* Role Distribution + Quick Actions */}
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
                    value={users.length > 0 ? (r.count / users.length) * 100 : 0}
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
                { label: "Manage Users",         path: "/user-management", icon: <People sx={{ fontSize: 16 }} /> },
                { label: "Roles & Permissions",  path: "/roles",           icon: <AdminPanelSettings sx={{ fontSize: 16 }} /> },
                { label: "Audit Logs",           path: "/audit-logs",      icon: <SupervisorAccount sx={{ fontSize: 16 }} /> },
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
    </Box>
  );
}
