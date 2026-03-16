"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  Chip,
  IconButton,
  Divider,
  TextField,
  MenuItem,
  InputAdornment,
  Pagination,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Event,
  NotificationsActive,
  Warning,
  CheckCircle,
  Delete,
  Refresh,
  ArrowForward,
  Close,
  PlayArrow,
  Stop,
  Edit,
  Send,
  Verified,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";

const ROWS_PER_PAGE = 15;

const notificationTypeConfig = {
  meeting_scheduled: { label: "Meeting Scheduled", color: "#004497", bg: "#f0f4ff", icon: Event },
  meeting_started: { label: "Meeting Started", color: "#0066cc", bg: "#e3f2fd", icon: PlayArrow },
  meeting_ended: { label: "Meeting Ended", color: "#666", bg: "#f5f5f5", icon: Stop },
  meeting_updated: { label: "Meeting Updated", color: "#0066cc", bg: "#e3f2fd", icon: Edit },
  confirm_attendance: { label: "Confirm Attendance", color: "#f57c00", bg: "#fff3e0", icon: Warning },
  attendance_confirmed: { label: "Attendance Confirmed", color: "#2e7d32", bg: "#e8f5e9", icon: CheckCircle },
  appeal_sent: { label: "Appeal Sent", color: "#f57c00", bg: "#fff3e0", icon: Send },
  appeal_received: { label: "Appeal Received", color: "#f57c00", bg: "#fff3e0", icon: NotificationsActive },
  appeal_reviewed: { label: "Appeal Reviewed", color: "#2e7d32", bg: "#e8f5e9", icon: Verified },
};

export default function NotificationsPageContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (currentUser?.id) fetchNotifications();
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('mams_access_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/notifications?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      const { notifications: data } = await response.json();
      setNotifications(data || []);
    } catch (err) {
      console.error('Error:', err);
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }

    if (filter && filter !== "all") {
      filtered = filtered.filter(n => n.type === filter);
    }

    return filtered;
  }, [search, filter, notifications]);

  const uniqueTypes = useMemo(
    () => [...new Set(notifications.map(n => n.type))].sort(),
    [notifications]
  );

  const totalPages = Math.ceil(filteredNotifications.length / ROWS_PER_PAGE);
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const handleNotificationClick = (notification) => {
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setNotifications(notifications.filter(n => n.id !== id));
    setSnackbar({ open: true, message: "Notification deleted", severity: "success" });
  };

  const getNotificationColor = (type) => {
    return notificationTypeConfig[type] || { label: type, color: "#666", bg: "#f5f5f5" };
  };

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : "All notifications read"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchNotifications} size="small" sx={{ color: "#9ca3af", "&:hover": { color: "#004497" } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filter and Search */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", p: 2.5, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "end" }}>
          <TextField
            size="small"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9ca3af" }} /></InputAdornment>,
            }}
            sx={{
              flex: 1,
              minWidth: 250,
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" },
            }}
          />
          <TextField
            select
            size="small"
            label="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ minWidth: 140, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
          >
            <MenuItem value="all">All Types</MenuItem>
            {uniqueTypes.map(type => (
              <MenuItem key={type} value={type}>
                {notificationTypeConfig[type]?.label || type}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* Notifications List */}
      <Paper elevation={0} sx={{ border: "1px solid #e8edf3", overflow: "hidden", borderRadius: 0 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">Loading notifications...</Typography>
          </Box>
        ) : paginatedNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <NotificationsActive sx={{ fontSize: 48, color: "#ccc", mb: 1 }} />
            <Typography color="text.secondary">No notifications found</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {paginatedNotifications.map((notification, idx) => {
              const config = getNotificationColor(notification.type);
              const isUnread = notification.status === "unread";

              return (
                <div key={notification.id}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleDelete(notification.id, e)}
                        sx={{ color: "#9ca3af", "&:hover": { color: "#c62828" } }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    }
                    sx={{
                      bgcolor: isUnread ? "#f0f7ff" : "transparent",
                      border: isUnread ? "1px solid #e3f2fd" : "none",
                      "&:hover": { bgcolor: "#fafbfc" },
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleNotificationClick(notification)}
                      sx={{ pr: 5, py: 2, borderRadius: 0 }}
                    >
                      <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
                        {/* Icon */}
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: config.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {config.icon && <config.icon sx={{ color: config.color, fontSize: 24 }} />}
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: isUnread ? 700 : 600,
                                color: "#1a1a2e",
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Chip
                              label={config.label}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                bgcolor: config.bg,
                                color: config.color,
                                fontWeight: 600,
                                borderRadius: 0,
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.message}
                          </Typography>

                          <Typography variant="caption" sx={{ color: "#9ca3af", display: "block", mt: 0.5 }}>
                            {notification.created_at
                              ? `${new Date(notification.created_at).toLocaleDateString()} at ${new Date(notification.created_at).toLocaleTimeString()}`
                              : ""}
                          </Typography>
                        </Box>

                        {/* Action Arrow */}
                        {notification.action_url && (
                          <ArrowForward sx={{ color: "#004497", alignSelf: "center", ml: 1 }} />
                        )}
                      </Box>
                    </ListItemButton>
                  </ListItem>
                  {idx < paginatedNotifications.length - 1 && <Divider />}
                </div>
              );
            })}
          </List>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(((page - 1) * ROWS_PER_PAGE) + 1, filteredNotifications.length)} to{" "}
              {Math.min(page * ROWS_PER_PAGE, filteredNotifications.length)} of {filteredNotifications.length}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, v) => setPage(v)}
              size="small"
              sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 } }}
            />
          </Box>
        )}
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
