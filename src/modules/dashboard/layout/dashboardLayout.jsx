"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  Box,
  Divider,
  Menu,
  MenuItem,
  Chip,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications,
  Dashboard,
  People,
  AdminPanelSettings,
  Assignment,
  ChevronLeft,
  Logout,
  AccountCircle,
  Settings,
  KeyboardArrowDown,
  Shield,
  DoneAll,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { auditLogsApi } from "../../../lib/apiClient";

const drawerWidth = 260;

const navItems = [
  { icon: <Dashboard />, label: "Dashboard", path: "/dashboard" },
  { icon: <People />, label: "User Management", path: "/user-management" },
  { icon: <AdminPanelSettings />, label: "Roles & Permissions", path: "/roles" },
  { icon: <Assignment />, label: "Audit Logs", path: "/audit-logs" },
];

function getRoleColor(role) {
  switch (role) {
    case "System Administrator":
      return { bg: "#c0392b", color: "#fff" };
    case "Admin":
      return { bg: "#b7791f", color: "#fff" };
    case "Chairperson":
      return { bg: "#2980b9", color: "#fff" };
    default:
      return { bg: "#6c757d", color: "#fff" };
  }
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function getNotifColor(action) {
  if (!action) return "#6b7280";
  if (action.includes("AUTH_FAILED") || action.includes("LOCKED") || action.includes("DELETE")) return "#f74a4d";
  if (action.includes("AUTH_LOGIN")) return "#018e11";
  if (action.includes("CREATE")) return "#004497";
  if (action.includes("SUSPENDED")) return "#FFB236";
  return "#6b7280";
}

function getRelativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem("mams_read_notifs") || "[]"));
    } catch {
      return new Set();
    }
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Fetch recent audit logs for notifications
  useEffect(() => {
    auditLogsApi
      .list({ limit: 15 })
      .then((result) => setNotifications(result.logs || []))
      .catch(() => {});
  }, []);

  const markAllRead = () => {
    const newReadIds = new Set([...readIds, ...notifications.map((n) => n.id)]);
    setReadIds(newReadIds);
    if (typeof window !== "undefined") {
      localStorage.setItem("mams_read_notifs", JSON.stringify([...newReadIds]));
    }
  };

  const markRead = (id) => {
    const newReadIds = new Set([...readIds, id]);
    setReadIds(newReadIds);
    if (typeof window !== "undefined") {
      localStorage.setItem("mams_read_notifs", JSON.stringify([...newReadIds]));
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);
  const handleNotifOpen = (e) => setNotifAnchor(e.currentTarget);
  const handleNotifClose = () => setNotifAnchor(null);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const roleColor = getRoleColor(currentUser?.role);

  const sidebarContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #004497 0%, #1c56a3 60%, #2a6ab8 100%)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Logo + Brand */}
      <Box
        sx={{
          px: 2.5,
          py: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          minHeight: 72,
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "10px",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backdropFilter: "blur(8px)",
          }}
        >
          <Shield sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
        {!sidebarCollapsed && (
          <Box sx={{ overflow: "hidden" }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#fff",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              URA MAMS
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.68rem", whiteSpace: "nowrap" }}
            >
              Admin Portal
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1.5, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
          return (
            <ListItemButton
              key={item.label}
              onClick={() => {
                router.push(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: "10px",
                mb: 0.5,
                px: 1.5,
                py: 1.1,
                transition: "all 0.2s ease",
                background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                "&:hover": {
                  background: "rgba(255,255,255,0.12)",
                },
                "& .MuiListItemIcon-root": {
                  minWidth: sidebarCollapsed ? "auto" : 40,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                  fontSize: 20,
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!sidebarCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.8)",
                    noWrap: true,
                  }}
                />
              )}
              {isActive && !sidebarCollapsed && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#80d2e9",
                    ml: "auto",
                    flexShrink: 0,
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* User Card at Bottom */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: "rgba(255,255,255,0.2)",
            fontSize: "0.8rem",
            fontWeight: 700,
            flexShrink: 0,
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          {getInitials(currentUser?.firstName, currentUser?.lastName)}
        </Avatar>
        {!sidebarCollapsed && (
          <Box sx={{ overflow: "hidden", flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.8rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentUser?.firstName} {currentUser?.lastName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}
            >
              {currentUser?.role}
            </Typography>
          </Box>
        )}
        {!sidebarCollapsed && (
          <IconButton size="small" onClick={handleLogout} sx={{ color: "rgba(255,255,255,0.7)", p: 0.5 }}>
            <Logout fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f4f6f9" }}>
      {/* Desktop Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: sidebarCollapsed ? 72 : drawerWidth },
          flexShrink: { md: 0 },
          display: { xs: "none", md: "block" },
          transition: "width 0.3s ease",
        }}
      >
        <Box
          sx={{
            width: sidebarCollapsed ? 72 : drawerWidth,
            height: "100vh",
            position: "fixed",
            top: 0,
            left: 0,
            transition: "width 0.3s ease",
            zIndex: 1200,
            boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
          }}
        >
          {sidebarContent}
        </Box>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            border: "none",
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* AppBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "#ffffff",
            borderBottom: "1px solid #e8edf3",
            zIndex: 1100,
            boxShadow: "0 2px 8px rgba(0,68,151,0.06)",
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
            {/* Mobile menu toggle */}
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" }, color: "#004497" }}
            >
              <MenuIcon />
            </IconButton>

            {/* Desktop sidebar collapse */}
            <IconButton
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              sx={{ display: { xs: "none", md: "flex" }, color: "#004497", mr: 1 }}
            >
              {sidebarCollapsed ? <MenuIcon /> : <ChevronLeft />}
            </IconButton>

            {/* Page Title */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#004497",
                fontSize: { xs: "1rem", sm: "1.1rem" },
                flex: 1,
              }}
            >
              {navItems.find((n) => pathname === n.path || pathname?.startsWith(n.path + "/"))?.label || "Dashboard"}
            </Typography>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton onClick={handleNotifOpen} sx={{ color: "#004497" }}>
                <Badge badgeContent={unreadCount > 0 ? unreadCount : null} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={handleNotifClose}
              PaperProps={{
                sx: { width: 360, maxHeight: 480, mt: 1, borderRadius: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden" },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              {/* Notification Header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderBottom: "1px solid #e8edf3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="#004497">
                    Notifications
                  </Typography>
                  {unreadCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {unreadCount} unread
                    </Typography>
                  )}
                </Box>
                {unreadCount > 0 && (
                  <Tooltip title="Mark all as read">
                    <Button
                      size="small"
                      startIcon={<DoneAll sx={{ fontSize: 16 }} />}
                      onClick={markAllRead}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        color: "#004497",
                        py: 0.5,
                        borderRadius: 1.5,
                        "&:hover": { bgcolor: "#e8f0fe" },
                      }}
                    >
                      Read all
                    </Button>
                  </Tooltip>
                )}
              </Box>

              {/* Notification Items */}
              <Box sx={{ overflowY: "auto", maxHeight: 360 }}>
                {notifications.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">No notifications</Typography>
                  </Box>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !readIds.has(notif.id);
                    return (
                      <MenuItem
                        key={notif.id}
                        onClick={() => { markRead(notif.id); handleNotifClose(); }}
                        sx={{
                          py: 1.5,
                          px: 2.5,
                          alignItems: "flex-start",
                          gap: 1.5,
                          bgcolor: isUnread ? "#f0f4ff" : "transparent",
                          "&:hover": { bgcolor: isUnread ? "#e8f0fe" : "#f8fafc" },
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: getNotifColor(notif.action), mt: 0.6, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontSize: "0.82rem", color: "#1a1a2e", lineHeight: 1.4, whiteSpace: "normal" }}>
                            {notif.description}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                              {getRelativeTime(notif.timestamp)}
                            </Typography>
                            {notif.module && (
                              <Chip
                                label={notif.module}
                                size="small"
                                sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#f3f4f6", color: "#6b7280", borderRadius: "4px" }}
                              />
                            )}
                          </Box>
                        </Box>
                        {isUnread && (
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#004497", mt: 0.8, flexShrink: 0 }} />
                        )}
                      </MenuItem>
                    );
                  })
                )}
              </Box>
            </Menu>

            {/* Profile Menu */}
            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                borderRadius: "10px",
                px: 1.5,
                py: 0.5,
                transition: "background 0.2s",
                "&:hover": { bgcolor: "#f0f4ff" },
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "#004497",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                {getInitials(currentUser?.firstName, currentUser?.lastName)}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e", fontSize: "0.82rem", lineHeight: 1.2 }}>
                  {currentUser?.firstName} {currentUser?.lastName}
                </Typography>
                <Chip
                  label={currentUser?.role}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.62rem",
                    bgcolor: roleColor.bg,
                    color: roleColor.color,
                    fontWeight: 600,
                    borderRadius: "4px",
                  }}
                />
              </Box>
              <KeyboardArrowDown sx={{ color: "#6c757d", fontSize: 18 }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: { width: 220, mt: 1, borderRadius: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <Box sx={{ p: 2, borderBottom: "1px solid #e8edf3" }}>
                <Typography variant="body2" fontWeight={700} color="#1a1a2e">
                  {currentUser?.firstName} {currentUser?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser?.email}
                </Typography>
              </Box>
              <MenuItem onClick={() => { router.push(`/user-profile/${currentUser?.id}`); handleProfileMenuClose(); }} sx={{ gap: 1.5, py: 1.2 }}>
                <AccountCircle fontSize="small" sx={{ color: "#004497" }} />
                <Typography variant="body2">My Profile</Typography>
              </MenuItem>
              <MenuItem onClick={handleProfileMenuClose} sx={{ gap: 1.5, py: 1.2 }}>
                <Settings fontSize="small" sx={{ color: "#004497" }} />
                <Typography variant="body2">Settings</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.2, color: "#f74a4d" }}>
                <Logout fontSize="small" />
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
