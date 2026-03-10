"use client";

import { useState, useMemo } from "react";
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
} from "@mui/icons-material";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
import { 
  MEETINGS, 
  MEETING_CATEGORIES, 
  MEETING_TYPES, 
  MEETING_STATUS 
} from "../../../data/dummyData";
import ScheduleMeetingModal from "../forms/scheduleMeetingModal";
import EditMeetingModal from "../forms/editMeetingModal";
import DeleteMeetingModal from "../forms/deleteMeetingModal";

const ROWS_PER_PAGE = 8;

export default function MeetingsPageContent() {
  const router = useRouter();
  const { users, currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
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

  const filteredMeetings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let meetings = [...MEETINGS];
    if (tab === 0) meetings = meetings;
    else if (tab === 1) meetings = meetings.filter(m => m.status === MEETING_STATUS.ONGOING);
    else if (tab === 1) meetings = meetings.filter(m => m.status === MEETING_STATUS.SCHEDULED && m.date >= today);
    else meetings = meetings.filter(m => m.status === MEETING_STATUS.COMPLETED);
    if (search) {
      const q = search.toLowerCase();
      meetings = meetings.filter(m => m.title.toLowerCase().includes(q) || m.location.toLowerCase().includes(q) || m.chairpersonName.toLowerCase().includes(q));
    }
    if (categoryFilter !== "All") meetings = meetings.filter(m => m.category === categoryFilter);
    if (typeFilter !== "All") meetings = meetings.filter(m => m.type === typeFilter);
    return meetings;
  }, [tab, search, categoryFilter, typeFilter]);

  const totalPages = Math.ceil(filteredMeetings.length / ROWS_PER_PAGE);
  const paginatedMeetings = filteredMeetings.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const ongoingCount = MEETINGS.filter(m => m.status === MEETING_STATUS.ONGOING).length;
  const upcomingCount = MEETINGS.filter(m => m.status === MEETING_STATUS.SCHEDULED).length;
  const completedCount = MEETINGS.filter(m => m.status === MEETING_STATUS.COMPLETED).length;

  const canManage = currentUser?.role === "System Administrator" || currentUser?.role === "Admin" || currentUser?.role === "Chairperson";

  const handleViewDetails = (meeting) => router.push(`/meetings/${meeting.id}`);
  
  const handleEdit = (meeting) => {
    setSelectedMeeting(meeting);
    setEditModalOpen(true);
  };

  const handleDelete = (meeting) => {
    setSelectedMeeting(meeting);
    setDeleteModalOpen(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };
  const handleCreateSuccess = () => {
    setSnackbar({ open: true, message: "Meeting scheduled successfully!", severity: "success" });
  };
  const handleEditSuccess = () => {
    setSnackbar({
      open: true,
      message: "Meeting updated successfully!",
      severity: "success",
    });
  };
  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSnackbar({
      open: true,
      message: "Meeting deleted successfully!",
      severity: "success",
    });
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
      `${m.startTime || ""} - ${m.endTime || ""}`,
      m.type || "",
      m.category || "",
      m.chairpersonName || "",
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
        <td>${m.startTime || "—"} - ${m.endTime || "—"}</td>
        <td>${m.type || "—"}</td>
        <td>${m.category || "—"}</td>
        <td>${m.chairpersonName || "—"}</td>
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
          {canManage && <Button startIcon={<Add />} variant="contained" onClick={() => setCreateModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)", boxShadow: "0 4px 12px rgba(0,68,151,0.3)", "&:hover": { background: "linear-gradient(135deg, #003380, #1549a0)", transform: "translateY(-1px)" } }}>Schedule Meeting</Button>}
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
        { label: "Total", value: MEETINGS.length, color: "#004497", bg: "#f0f4ff" },
        { label: "Ongoing", value: ongoingCount, color: "#2e7d32", bg: "#e8f5e9" },
        { label: "Upcoming", value: upcomingCount, color: "#0b6cc2", bg: "#e3f2fd" },
        { label: "Completed", value: completedCount, color: "#4b4c4d", bg: "#f3f4f6" }
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
                <MenuItem value="All">All</MenuItem>
                <MenuItem value={MEETING_CATEGORIES.INTERNAL}>
                  Internal
                </MenuItem>
                <MenuItem value={MEETING_CATEGORIES.EXTERNAL}>
                  External
                </MenuItem>
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
                <MenuItem value="All">All</MenuItem>
                <MenuItem value={MEETING_TYPES.MANAGEMENT}>
                  Management
                </MenuItem>
                <MenuItem value={MEETING_TYPES.TEAM}>Team</MenuItem>
              </Select>
            </FormControl>
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
          sx={{
            px: 2,
            borderBottom: "1px solid #e8edf3",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.85rem",
              minHeight: 44,
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
            label={`All meetings (${MEETINGS.length})`}
          />
          <Tab
            icon={<Today sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Ongoing (${ongoingCount})`}
          />
          <Tab
            icon={<Schedule sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Upcoming (${upcomingCount})`}
          />
          <Tab
            icon={<History sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Completed (${completedCount})`}
          />
        </Tabs>
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
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}>
                        <Typography
                          sx={{
                            color: "#e0e0e0",
                            bgcolor: "#f5f5f5",
                            borderRadius: 1,
                            height: 20,
                          }}
                        >
                          Loading
                        </Typography>
                      </TableCell>
                    ))}
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
                        sx={{ fontWeight: 600, color: "#1a1a2e" }}
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
                        {meeting.startTime} - {meeting.endTime}
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
                            meeting.type === "Management"
                              ? "#fce4ec"
                              : "#e0f2f1",
                          color:
                            meeting.type === "Management"
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
                            meeting.category === "Internal"
                              ? "#e8f0fe"
                              : "#fef3e2",
                          color:
                            meeting.category === "Internal"
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
                          {meeting.chairpersonName}
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
                          {meeting.location}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={meeting.status}
                        size="small"
                        sx={{
                          borderRadius: 1.5,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          bgcolor:
                            meeting.status === "Ongoing"
                              ? "#e8f5e9"
                              : meeting.status === "Scheduled"
                              ? "#e3f2fd"
                              : "#f3f4f6",
                          color:
                            meeting.status === "Ongoing"
                              ? "#2e7d32"
                              : meeting.status === "Scheduled"
                              ? "#0b6cc2"
                              : "#4b4c4d",
                        }}
                      />
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
        {/* pagination */}
        {totalPages > 1 && (
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #e8edf3",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Showing {((page - 1) * ROWS_PER_PAGE) + 1} to{" "}
              {Math.min(page * ROWS_PER_PAGE, filteredMeetings.length)} of{" "}
              {filteredMeetings.length}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, v) => setPage(v)}
              siblingCount={1}
              boundaryCount={1}
              size="small"
              sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 } }}
            />
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
