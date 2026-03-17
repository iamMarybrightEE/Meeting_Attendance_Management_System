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
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  Skeleton,
} from "@mui/material";
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Event,
  LocationOn,
  Person,
  Refresh,
  Today,
  Schedule,
  History,
  GetApp,
  ExpandMore,
  TableChart,
  PictureAsPdf,
  Groups,
} from "@mui/icons-material";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
import { getUserChairedMeetings, isSystemAdmin } from "../../../lib/permissions";
import ScheduleMeetingModal from "../forms/scheduleMeetingModal";
import EditMeetingModal from "../forms/editMeetingModal";
import DeleteMeetingModal from "../forms/deleteMeetingModal";

const ROWS_PER_PAGE = 8;

export default function MeetingsPageContent() {
  const router = useRouter();
  const { users, currentUser } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [exportAnchor, setExportAnchor] = useState(null);
  const canManage = currentUser?.role === "System Administrator" || currentUser?.role === "Admin" || currentUser?.role === "Chairperson";
  const isAdminUser = isSystemAdmin(currentUser);

  // Extract unique categories and types from meetings data
  const categories = useMemo(() => {
    const cats = [...new Set(meetings.map(m => m.category).filter(Boolean))];
    return ["All", ...cats];
  }, [meetings]);

  const types = useMemo(() => {
    const typs = [...new Set(meetings.map(m => m.type).filter(Boolean))];
    return ["All", ...typs];
  }, [meetings]);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('mams_access_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Failed to fetch meetings (${response.status})`);
      }
      
      setMeetings(data.meetings || []);
    
      if (data.meetings?.length === 0) {
        console.warn('No meetings returned from API');
      }
    } catch (err) {
      console.error('Fetch meetings error:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Failed to fetch meetings', 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let filtered = [...meetings];
    
    if (tab === 0) filtered = filtered; // All
    else if (tab === 1) filtered = filtered.filter(m => m.status === 'ongoing');
    else if (tab === 2) {
      // Upcoming: only scheduled meetings with date >= today
      filtered = filtered.filter(m => m.status === 'scheduled' && m.date >= today);
    }
    else if (tab === 3) filtered = filtered.filter(m => m.status === 'ended');
    else if (tab === 4) {
      // My Chaired Meetings
      filtered = getUserChairedMeetings(filtered, currentUser?.id);
    }
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(q) || 
        (m.location && m.location.toLowerCase().includes(q)) ||
        (m.organizer_id?.first_name && m.organizer_id.first_name.toLowerCase().includes(q)) ||
        (m.organizer_id?.last_name && m.organizer_id.last_name.toLowerCase().includes(q))
      );
    }
    
    if (categoryFilter !== "All") filtered = filtered.filter(m => m.category === categoryFilter);
    if (typeFilter !== "All") filtered = filtered.filter(m => m.type === typeFilter);
    if (dateFrom) filtered = filtered.filter(m => m.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(m => m.date <= dateTo);
    if (locationFilter) {
      const loc = locationFilter.toLowerCase();
      filtered = filtered.filter(m => m.location && m.location.toLowerCase().includes(loc));
    }
    
    return filtered;
  }, [tab, search, categoryFilter, typeFilter, dateFrom, dateTo, locationFilter, meetings, currentUser?.id]);

  const totalPages = Math.ceil(filteredMeetings.length / ROWS_PER_PAGE);
  const paginatedMeetings = filteredMeetings.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const getStatusChip = (status) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', color: 'info' },
      ongoing: { label: 'Ongoing', color: 'success' },
      ended: { label: 'Ended', color: 'default' },
      cancelled: { label: 'Cancelled', color: 'error' },
    };
    return statusConfig[status] || { label: status, color: 'default' };
  };

  const handleViewDetails = (meeting) => router.push(`/meetings/${meeting.id}`);
  
  const handleEdit = async (meeting) => {
    try {
      const token = localStorage.getItem('mams_access_token');
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meeting details');
      }

      const data = await response.json();
      setSelectedMeeting(data.meeting);
      setEditModalOpen(true);
    } catch (err) {
      console.error('Error fetching meeting details:', err);
      setSnackbar({ open: true, message: 'Failed to load meeting details', severity: 'error' });
    }
  };

  const handleDelete = (meeting) => {
    setSelectedMeeting(meeting);
    setDeleteModalOpen(true);
  };

  const handleRefresh = () => {
    fetchMeetings();
  };

  const handleCreateSuccess = () => {
    fetchMeetings();
    setSnackbar({ open: true, message: "Meeting scheduled successfully!", severity: "success" });
  };

  const handleEditSuccess = () => {
    fetchMeetings();
    setEditModalOpen(false);
    setSnackbar({ open: true, message: "Meeting updated successfully!", severity: "success" });
  };

  const handleDeleteSuccess = () => {
    fetchMeetings();
    setDeleteModalOpen(false);
    setSnackbar({ open: true, message: "Meeting deleted successfully!", severity: "success" });
  };

  const exportCSV = () => {
    const headers = [
      "Meeting ID",
      "Title",
      "Date",
      "Time",
      "Type",
      "Category",
      "Chairperson",
      "Location",
      "Status",
    ];
    const rows = filteredMeetings.map((m) => [
      m.id || "",
      m.title || "",
      m.date || "",
      `${m.start_time || ""} - ${m.end_time || ""}`,
      m.type || "",
      m.category || "",
      m.chairperson_id ? `${m.chairperson_id.first_name} ${m.chairperson_id.last_name}` : "",
      m.location || "",
      m.status || "",
    ]);
    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meetings_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportAnchor(null);
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    const tableRows = filteredMeetings
      .map(
        (m) => `
      <tr>
        <td>${m.id || "—"}</td>
        <td>${m.title || "—"}</td>
        <td>${m.date || "—"}</td>
        <td>${m.start_time || "—"} - ${m.end_time || "—"}</td>
        <td>${m.type || "—"}</td>
        <td>${m.category || "—"}</td>
        <td>${m.chairperson_id ? `${m.chairperson_id.first_name} ${m.chairperson_id.last_name}` : "—"}</td>
        <td>${m.location || "—"}</td>
        <td>${m.status || "—"}</td>
      </tr>
    `
      )
      .join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meetings Export</title>
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
        <h2>URA MAMS — Meetings List</h2>
        <p>Exported on ${new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })} &nbsp;|&nbsp; ${filteredMeetings.length} meetings</p>
        <table>
          <thead>
            <tr>
              <th>Meeting ID</th><th>Title</th><th>Date</th><th>Time</th><th>Type</th><th>Category</th><th>Chairperson</th><th>Location</th><th>Status</th>
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
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        {/* header */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>Meetings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage meetings, track attendance, and review appeals</Typography>
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
            startIcon={<Visibility />}
            variant="outlined"
            onClick={() => router.push("/attendance")}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              border: "2px solid transparent",
              background:
                "linear-gradient(transparent, transparent) padding-box, linear-gradient(135deg, #004497 0%, #1c56a3 100%) border-box",
              backgroundClip: "padding-box, border-box",

              // gradient text
              backgroundImage: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",

              boxShadow: "0 4px 12px rgba(0,68,151,0.3)",

              "&:hover": {
                transform: "translateY(-1px)",
                background:
                  "linear-gradient(135deg, #003380, #1549a0) padding-box, linear-gradient(135deg, #003380, #1549a0) border-box",
                WebkitTextFillColor: "#fff",
                color: "#fff",
              },
            }}
          >
            View Attendance
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => setCreateModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)", boxShadow: "0 4px 12px rgba(0,68,151,0.3)", "&:hover": { background: "linear-gradient(135deg, #003380, #1549a0)", transform: "translateY(-1px)" } }}>Schedule Meeting</Button>
        </Box>
      </Box>
      {/* meeting cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
        { label: "Total", value: meetings.length, color: "#004497", bg: "#f0f4ff" },
        { label: "Ongoing", value: meetings.filter(m => m.status === 'ongoing').length, color: "#2e7d32", bg: "#e8f5e9" },
        { label: "Upcoming", value: meetings.filter(m => m.status === 'scheduled').length, color: "#0b6cc2", bg: "#e3f2fd" },
        { label: "Completed", value: meetings.filter(m => m.status === 'ended').length, color: "#4b4c4d", bg: "#f3f4f6" }
        ].map((stat) => (
          <Paper key={stat.label} elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: stat.bg, border: `1px solid ${stat.color}22`, "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography variant="caption" sx={{ color: "#555", fontWeight: 500, mt: 0.5, display: "block" }}> {stat.label} meetings</Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search meetings..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "#9ca3af", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              minWidth: 220,
              maxWidth: 340,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f9fafb",
              },
            }}
          />
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: "0.82rem" }}>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                label="Category"
                sx={{
                  borderRadius: 2,
                  fontSize: "0.82rem",
                  bgcolor: "#f9fafb",
                }}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ fontSize: "0.82rem" }}>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                label="Type"
                sx={{
                  borderRadius: 2,
                  fontSize: "0.82rem",
                  bgcolor: "#f9fafb",
                }}
              >
                {types.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="Date From"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 140,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f9fafb",
                },
              }}
            />
            <TextField
              size="small"
              type="date"
              label="Date To"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 140,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f9fafb",
                },
              }}
            />
            <TextField
              size="small"
              placeholder="Filter by location"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              sx={{
                minWidth: 160,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f9fafb",
                },
              }}
            />
          </Box>
          <Tooltip title="Refresh">
            <IconButton
              onClick={handleRefresh}
              size="small"
              sx={{
                color: "#9ca3af",
                "&:hover": { color: "#004497" },
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {/* tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: "1px solid #e8edf3",
            overflow: { xs: "auto", sm: "visible" },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              fontSize: { xs: "0.75rem", sm: "0.85rem" },
              minHeight: 44,
              minWidth: { xs: "auto", sm: "120px" },
              whiteSpace: "nowrap",
            },
            "& .Mui-selected": {
              color: "#004497",
              fontWeight: 600,
            },
            "& .MuiTabs-indicator": {
              bgcolor: "#004497",
            },
          }}
        >
          <Tab
            icon={<Event sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`All (${meetings.length})`}
          />
          <Tab
            icon={<Today sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Ongoing (${meetings.filter(m => m.status === 'ongoing').length})`}
          />
          <Tab
            icon={<Schedule sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Upcoming (${meetings.filter(m => m.status === 'scheduled').length})`}
          />
          <Tab
            icon={<History sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Completed (${meetings.filter(m => m.status === 'ended').length})`}
          />
          <Tab
            icon={<Groups />}
            iconPosition="start"
            label={`Chaired (${getUserChairedMeetings(meetings, currentUser?.id).length})`}
          />
        </Tabs>
        {isAdminUser ? (
          <>
            {/* tables */}
            <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                    minWidth: 200,
                  }}
                >
                  Meeting
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                    minWidth: 160,
                  }}
                >
                  Date & Time
                </TableCell>
                {["Type", "Category", "Chairperson", "Location", "Status", "Actions"].map(
                  (h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 600,
                        color: "#6b7280",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 1.5,
                      }}
                    >
                      {h}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(ROWS_PER_PAGE)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Skeleton variant="text" width="70%" height={24} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="text" width="80%" height={16} sx={{ mt: 0.5 }} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="60%" height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="70%" height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 1 }} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rectangular" width={70} height={28} sx={{ borderRadius: 1 }} />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedMeetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No meetings found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMeetings.map((meeting) => (
                  <TableRow
                    key={meeting.id}
                    hover
                    sx={{ "&:hover": { bgcolor: "#f8fafc" } }}
                  >
                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography
                        variant="body2"
                        onClick={() => handleViewDetails(meeting)}
                        sx={{ 
                          fontWeight: 600, 
                          cursor: "pointer",
                          "&:hover": {
                            textDecoration: "underline",
                            color: "#004497",
                          }
                        }}
                      >
                        {meeting.title}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                        minWidth: 160,
                      }}
                    >
                      <Typography variant="body2">
                        <Event sx={{ fontSize: 14, color: "#9ca3af" }} />{" "}
                        {meeting.date}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {meeting.start_time} - {meeting.end_time}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={meeting.type}
                        size="small"
                        sx={{
                          borderRadius: 1.5,
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          bgcolor:
                            meeting.type === "management"
                              ? "#fce4ec"
                              : "#e0f2f1",
                          color:
                            meeting.type === "management"
                              ? "#c2185b"
                              : "#00695c",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={meeting.category}
                        size="small"
                        sx={{
                          borderRadius: 1.5,
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          bgcolor:
                            meeting.category === "internal"
                              ? "#e8f0fe"
                              : "#fef3e2",
                          color:
                            meeting.category === "internal"
                              ? "#004497"
                              : "#b86e00",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Person sx={{ fontSize: 16, color: "#9ca3af" }} />
                        <Typography variant="body2">
                          {meeting.chairperson_id ? `${meeting.chairperson_id.first_name} ${meeting.chairperson_id.last_name}` : 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <LocationOn sx={{ fontSize: 16, color: "#9ca3af" }} />
                        <Typography variant="body2">
                          {meeting.location || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(meeting.status) ? (
                        <Chip
                          label={getStatusChip(meeting.status).label}
                          size="small"
                          color={getStatusChip(meeting.status).color}
                          sx={{
                            borderRadius: 1.5,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(meeting)}
                            sx={{
                              color: "#6b7280",
                              "&:hover": {
                                color: "#004497",
                                bgcolor: "#f0f4ff",
                              },
                            }}
                          >
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        {canManage && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(meeting)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": {
                                    color: "#1c56a3",
                                    bgcolor: "#e0eaff",
                                  },
                                }}
                              >
                                <Edit sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(meeting)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": {
                                    color: "#FFB236",
                                    bgcolor: "#fff3cd",
                                  },
                                }}
                              >
                                <Delete sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
          </>
        ) : (
          <>
            {/* Card List for non-admin users */}
            <Box sx={{ mt: 2 }}>
              {loading ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
                  {[...Array(6)].map((_, i) => (
                    <Paper key={i} sx={{ p: 3, borderRadius: 2, border: "1px solid #e8edf3" }}>
                      <Skeleton variant="text" width="80%" height={28} sx={{ mb: 2 }} />
                      <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="70%" height={20} sx={{ mb: 1 }} />
                      <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
                        <Skeleton variant="rectangular" width={60} height={28} sx={{ borderRadius: 1 }} />
                        <Skeleton variant="rectangular" width={60} height={28} sx={{ borderRadius: 1 }} />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : paginatedMeetings.length === 0 ? (
                <Typography align="center" sx={{ py: 6 }} color="text.secondary">
                  No meetings found
                </Typography>
              ) : (
                <Box >
                  {paginatedMeetings.map((meeting) => (
                    <Box  key={meeting.id}>
                      <Card
                        sx={{
                          
                          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                          },
                          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                          border: "1px solid #e8edf3",
                        }}
                        onClick={() => handleViewDetails(meeting)}
                      >
                        <CardContent sx={{ p: 3, display: "flex", alignItems: { xs: "start", md: "center" }, gap: 1.5, justifyContent: "space-between", flexDirection: { xs: "column", md: "row" } }}>
                          <Box>

                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              color: "#1a1a2e",
                              mb: 2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {meeting.title}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: { xs: "start", md: "center" }, gap: 1, flexDirection: { xs: "column", md: "row" }}}>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                <Event sx={{ fontSize: 18, color: "#004497" }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {meeting.date} • {meeting.start_time} - {meeting.end_time}
                                </Typography>
                                
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                <LocationOn sx={{ fontSize: 18, color: "#2e7d32" }} />
                                <Typography variant="body2">{meeting.location || 'N/A'}</Typography>
                              </Box>
                          </Box>
                          
                          </Box>
                          <Box sx={{display: "flex", justifyContent: "right", flexDirection: "column", gap:1}}>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent:{ xs: "start", md: "flex-end" }}}>
                            <Chip
                              label={meeting.type}
                              size="small"
                              sx={{
                                borderRadius: 1.5,
                                fontSize: "0.7rem",
                                fontWeight: 500,
                                bgcolor: meeting.type === "management" ? "#fce4ec" : "#e0f2f1",
                                color: meeting.type === "management" ? "#c2185b" : "#00695c",
                              }}
                            />
                            <Chip
                              label={meeting.category}
                              size="small"
                              sx={{
                                borderRadius: 1.5,
                                fontSize: "0.7rem",
                                fontWeight: 500,
                                bgcolor: meeting.category === "internal" ? "#e8f0fe" : "#fef3e2",
                                color: meeting.category === "internal" ? "#004497" : "#b86e00",
                              }}
                            />
                            {getStatusChip(meeting.status) && (
                              <Chip
                                label={getStatusChip(meeting.status).label}
                                size="small"
                                color={getStatusChip(meeting.status).color}
                                sx={{
                                  borderRadius: 1.5,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Box>
                            
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                              <Person sx={{ fontSize: 18, color: "#9c27b0" }} />

                              <Typography variant="body2">
                                
                                {meeting.chairperson_id ? `Chaired by: ${meeting.chairperson_id.first_name} ${meeting.chairperson_id.last_name}` : 'N/A'}
                              </Typography>
                              
                            </Box>
                          </Box>
                          
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Pagination */}
        {filteredMeetings.length > 0 && (
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(((page - 1) * ROWS_PER_PAGE) + 1, filteredMeetings.length)} to {Math.min(page * ROWS_PER_PAGE, filteredMeetings.length)} of {filteredMeetings.length}
            </Typography>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                size="small"
                sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 } }}
              />
            )}
          </Box>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ScheduleMeetingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
      <EditMeetingModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        selectedMeeting={selectedMeeting}
        onSuccess={handleEditSuccess}
      />
      <DeleteMeetingModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        selectedMeeting={selectedMeeting}
        onSubmit={handleDeleteSuccess}
      />
    </Box>
  );
}
