"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Divider,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Checkbox,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  Event,
  CalendarMonth,
  Warning,
  CheckCircle,
  Cancel,
  Delete,
  DoneAll,
  MarkEmailUnread,
  MarkEmailRead,
  Refresh,
  FilterList,
  Notifications,
  Add,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { MEETING_NOTIFICATIONS } from "../../../data/dummyData";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function getNotificationIcon(type) {
  const icons = {
    meeting_reminder: <CalendarMonth sx={{ fontSize: 20 }} />,
    meeting_invite: <Event sx={{ fontSize: 20 }} />,
    appeal_update: <Warning sx={{ fontSize: 20 }} />,
    attendance_reminder: <Notifications sx={{ fontSize: 20 }} />,
    meeting_cancelled: <Cancel sx={{ fontSize: 20 }} />,
  };
  return icons[type] || <Notifications sx={{ fontSize: 20 }} />;
}

function getNotificationColors(type) {
  const colors = {
    meeting_reminder: { bg: "#e3f2fd", color: "#0b6cc2" },
    meeting_invite: { bg: "#e8f0fe", color: "#004497" },
    appeal_update: { bg: "#fff3cd", color: "#856404" },
    attendance_reminder: { bg: "#fef3e2", color: "#b86e00" },
    meeting_cancelled: { bg: "#fde8e8", color: "#f74a4d" },
  };
  return colors[type] || { bg: "#f5f5f5", color: "#6c757d" };
}

export default function NotificationsPageContent() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState(MEETING_NOTIFICATIONS);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const userNotifications = useMemo(() => {
    return notifications.filter(n => n.userId === currentUser?.id || n.userId === "usr-001");
  }, [notifications, currentUser]);

  const filteredNotifications = useMemo(() => {
    if (!search) return userNotifications;
    const q = search.toLowerCase();
    return userNotifications.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
  }, [userNotifications, search]);

  const unreadCount = userNotifications.filter(n => !n.isRead).length;
  const unreadNotifications = filteredNotifications.filter(n => !n.isRead);
  const readNotifications = filteredNotifications.filter(n => n.isRead);

  const handleMarkAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setSnackbar({ open: true, message: "All notifications marked as read", severity: "success" });
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setSnackbar({ open: true, message: "Notification deleted", severity: "success" });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            View and manage your meeting notifications
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            startIcon={<DoneAll />}
            variant="outlined"
            onClick={handleMarkAllAsRead}
            size="small"
            sx={{ borderRadius: 2, textTransform: "none", borderColor: "#004497", color: "#004497", "&:hover": { bgcolor: "#f0f4ff" } }}
          >
            Mark All Read
          </Button>
          
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
          { label: "Total", value: userNotifications.length, color: "#004497", bg: "#f0f4ff" },
          { label: "Unread", value: unreadCount, color: "#b86e00", bg: "#fef3e2" },
          { label: "Read", value: userNotifications.length - unreadCount, color: "#2e7d32", bg: "#e8f5e9" },
        ].map((stat) => (
          <Paper
            key={stat.label}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: stat.bg,
              border: `1px solid ${stat.color}22`,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography variant="caption" sx={{ color: "#555", fontWeight: 500, mt: 0.5, display: "block" }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Main Content */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        {/* Toolbar */}
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9ca3af", fontSize: 20 }} /></InputAdornment>,
            }}
            sx={{
              flex: 1,
              minWidth: 220,
              maxWidth: 340,
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" },
            }}
          />
          <Tooltip title="Refresh">
            <IconButton size="small" sx={{ color: "#9ca3af", "&:hover": { color: "#004497" } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2,
            borderBottom: "1px solid #e8edf3",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem", minHeight: 44 },
            "& .Mui-selected": { color: "#004497", fontWeight: 600 },
            "& .MuiTabs-indicator": { bgcolor: "#004497" },
          }}
        >
          <Tab icon={<MarkEmailUnread sx={{ fontSize: 18 }} />} iconPosition="start" label={`Unread (${unreadNotifications.length})`} />
          <Tab icon={<MarkEmailRead sx={{ fontSize: 18 }} />} iconPosition="start" label={`Read (${readNotifications.length})`} />
          <Tab icon={<FilterList sx={{ fontSize: 18 }} />} iconPosition="start" label={`All (${filteredNotifications.length})`} />
        </Tabs>

        {/* Notifications List */}
        <Box sx={{ maxHeight: 500, overflow: "auto" }}>
          {tab === 0 && unreadNotifications.length === 0 && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">No unread notifications</Typography>
            </Box>
          )}
          {tab === 1 && readNotifications.length === 0 && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">No read notifications</Typography>
            </Box>
          )}
          {(tab === 2 ? filteredNotifications : tab === 0 ? unreadNotifications : readNotifications).map((notification, index, arr) => {
            const colors = getNotificationColors(notification.type);
            return (
              <Box key={notification.id}>
                <ListItemButton
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: notification.isRead ? "transparent" : colors.bg,
                    "&:hover": { bgcolor: "#f8fafc" },
                    transition: "background-color 0.2s",
                  }}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: colors.bg,
                        color: colors.color,
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 500 : 600, color: "#1a1a2e" }}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#9ca3af", mt: 0.5, display: "block" }}>
                          {mounted ? new Date(notification.createdAt).toLocaleString() : "-"}
                        </Typography>
                      </>
                    }
                  />
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    {!notification.isRead && (
                      <Chip label="New" size="small" sx={{ borderRadius: 1, fontSize: "0.65rem", fontWeight: 600, bgcolor: "#004497", color: "#fff" }} />
                    )}
                    <Tooltip title="Delete notification">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }} sx={{ color: "#d0d5dd", transition: "all 0.2s", "&:hover": { color: "#f74a4d", bgcolor: "#fde8e8" } }}>
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemButton>
                {index < arr.length - 1 && <Divider />}
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
