"use client";

import { useState, useMemo, useEffect } from "react";
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
  Pagination,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  Refresh,
  GetApp,
  ExpandMore,
  TableChart,
  PictureAsPdf,
} from "@mui/icons-material";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from "@mui/material";
import { FormControl, InputLabel, Select } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";

const ROWS_PER_PAGE = 10;

export default function AttendancePageContent() {
  const { currentUser } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [exportAnchor, setExportAnchor] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [totalMeetings, setTotalMeetings] = useState(0);

  // Role flags (must be declared before using in memos)
  const isSystemAdmin = currentUser?.role === 'System Administrator';
  const isAdmin = currentUser?.role === 'Admin';

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser?.id) fetchAttendanceRecords();
  }, [currentUser]);

  // Auto-reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, nameFilter, departmentFilter, statusFilter]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('mams_access_token');
      if (!token) throw new Error('No authentication token found');

      const isSystemAdmin = currentUser?.role === 'System Administrator';
      const isAdmin = currentUser?.role === 'Admin';

      const response = await fetch('/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch attendance');
      const { meetings: meetingsData } = await response.json();
      const meetings = Array.isArray(meetingsData) ? meetingsData : [];
      const records = [];

      for (const meeting of meetings) {
        const attendees = meeting.meeting_attendees || [];

        if (!isSystemAdmin && !isAdmin) {
          // Staff: only their records
          const staffAttendance = attendees.find(a => a.user_id === currentUser.id);
          if (staffAttendance) {
            records.push({
              id: `${meeting.id}-${currentUser.id}`,
              meeting_name: meeting.title,
              date: meeting.date,
              start_time: meeting.start_time,
              end_time: meeting.end_time,
              chairperson: meeting.organizer_id?.first_name 
                ? `${meeting.organizer_id.first_name} ${meeting.organizer_id.last_name}` 
                : 'N/A',
              location: meeting.location,
              status: meeting.status === 'scheduled' || meeting.status === 'ongoing' ? 'pending' : staffAttendance.status,
              name: null,
              department: null,
            });
          }
        } else if (isAdmin) {
          // Admin: department only
          for (const attendee of attendees) {
            if (attendee.profiles?.department === currentUser.department) {
              records.push({
                id: `${meeting.id}-${attendee.user_id}`,
                meeting_name: meeting.title,
                date: meeting.date,
                start_time: meeting.start_time,
                end_time: meeting.end_time,
                chairperson: meeting.organizer_id?.first_name 
                  ? `${meeting.organizer_id.first_name} ${meeting.organizer_id.last_name}` 
                  : 'N/A',
                location: meeting.location,
                status: meeting.status === 'scheduled' || meeting.status === 'ongoing' ? 'pending' : attendee.status,
                name: `${attendee.profiles?.first_name} ${attendee.profiles?.last_name}`,
                department: attendee.profiles?.department,
              });
            }
          }
        } else {
          // System Admin: all
          for (const attendee of attendees) {
            records.push({
              id: `${meeting.id}-${attendee.user_id}`,
              meeting_name: meeting.title,
              date: meeting.date,
              start_time: meeting.start_time,
              end_time: meeting.end_time,
              chairperson: meeting.organizer_id?.first_name 
                ? `${meeting.organizer_id.first_name} ${meeting.organizer_id.last_name}` 
                : 'N/A',
              location: meeting.location,
              status: meeting.status === 'scheduled' || meeting.status === 'ongoing' ? 'pending' : attendee.status,
              name: `${attendee.profiles?.first_name} ${attendee.profiles?.last_name}`,
              department: attendee.profiles?.department,
            });
          }
        }
      }

      setAttendanceRecords(records);
      setTotalMeetings(meetings.length);
    } catch (err) {
      console.error('Error:', err);
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filter dropdowns
  const uniqueNames = useMemo(() => {
    const names = new Set();
    attendanceRecords.forEach(r => {
      if (r.name) names.add(r.name);
    });
    return Array.from(names).sort();
  }, [attendanceRecords]);

  const uniqueDepartments = useMemo(() => {
    const deps = new Set();
    attendanceRecords.forEach(r => {
      if (r.department) deps.add(r.department);
    });
    return Array.from(deps).sort();
  }, [attendanceRecords]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    attendanceRecords.forEach(r => {
      statuses.add(r.status);
    });
    return Array.from(statuses).sort();
  }, [attendanceRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...attendanceRecords];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.meeting_name.toLowerCase().includes(q) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        r.chairperson.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        r.status.toLowerCase().includes(q)
      );
    }

    if (nameFilter && (isAdmin || isSystemAdmin)) {
      filtered = filtered.filter(r => r.name === nameFilter);
    }

    if (departmentFilter && isSystemAdmin) {
      filtered = filtered.filter(r => r.department === departmentFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter(r => r.date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(r => r.date <= dateTo);
    }

    return filtered;
  }, [search, dateFrom, dateTo, nameFilter, departmentFilter, statusFilter, attendanceRecords, isAdmin, isSystemAdmin]);

  const totalPages = Math.ceil(filteredRecords.length / ROWS_PER_PAGE);
  const paginatedRecords = filteredRecords.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return { total: 0, present: 0, missed: 0, excused: 0 };
    
    return {
      total: filteredRecords.length,
      present: filteredRecords.filter(r => r.status === 'present').length,
      missed: filteredRecords.filter(r => r.status === 'missed').length,
      excused: filteredRecords.filter(r => r.status === 'excused').length,
    };
  }, [filteredRecords]);

  const handleRefresh = () => fetchAttendanceRecords();

  const getStatusColor = (status) => {
    const colors = {
      present: { bg: '#e8f5e9', text: '#2e7d32' },
      missed: { bg: '#ffebee', text: '#c62828' },
      excused: { bg: '#fff3e0', text: '#f57c00' },
      pending: { bg: '#e3f2fd', text: '#0b6cc2' },
    };
    return colors[status] || { bg: '#f5f5f5', text: '#666' };
  };

  const exportCSV = () => {
    const headers = ['Meeting', 'Date', 'Start', 'End', 'Chairperson', 'Location', 'Status'];
    if (isAdmin || isSystemAdmin) headers.splice(1, 0, 'Name');
    if (isSystemAdmin) headers.splice(2, 0, 'Department');

    const rows = filteredRecords.map(r => {
      const row = [r.meeting_name, r.date, r.start_time, r.end_time, r.chairperson, r.location, r.status];
      if (isAdmin || isSystemAdmin) row.splice(1, 0, r.name || '');
      if (isSystemAdmin) row.splice(2, 0, r.department || '');
      return row;
    });

    const csvContent = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportAnchor(null);
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    const exportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const confirmedCount = filteredRecords.filter(r => r.status === "Confirmed").length;
    const pendingCount = filteredRecords.filter(r => r.status === "Pending").length;

    const tableHeaders = ['Meeting', 'Date', 'Start', 'End', 'Chairperson', 'Location', 'Status'];
    if (isAdmin || isSystemAdmin) tableHeaders.splice(1, 0, 'Name');
    if (isSystemAdmin) tableHeaders.splice(2, 0, 'Department');

    const tableRows = filteredRecords.map(r => {
      const row = [r.meeting_name, r.date, r.start_time, r.end_time, r.chairperson, r.location, r.status];
      if (isAdmin || isSystemAdmin) row.splice(1, 0, r.name || '');
      if (isSystemAdmin) row.splice(2, 0, r.department || '');
      return row;
    });

    const table = `
      <table style="border-collapse:collapse;width:100%;font-size:12px;margin-top:16px;">
        <thead>
          <tr style="background:#004497;color:white;">
            ${tableHeaders.map(h => `<th style="padding:10px;text-align:left;font-weight:bold;font-size:11px;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows.map((row, idx) => `<tr style="background-color:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};border-bottom:1px solid #e8edf3;"><td style="padding:8px;">${row.join('</td><td style="padding:8px;">')}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1a1a2e; }
          h1 { color: #004497; margin: 0 0 4px 0; font-size: 18px; }
          .summary { color: #6b7280; margin-bottom: 16px; font-size: 11px; }
          .stats { margin: 16px 0; padding: 12px; background: #f0f4f8; border-left: 4px solid #004497; }
          .stat-item { display: inline-block; margin-right: 24px; font-size: 12px; }
          .stat-label { color: #6b7280; font-size: 11px; }
          .stat-value { color: #004497; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>URA MAMS — Attendance Report</h1>
        <p class="summary">Exported on ${exportDate} | Total Records: ${filteredRecords.length}</p>
        ${table}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
    setExportAnchor(null);
  };

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>
            {mounted && (isSystemAdmin ? 'All Attendance Records' : isAdmin ? `${currentUser?.department} Attendance` : 'Your Attendance')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mounted && (isSystemAdmin ? 'View and manage staff attendance across all departments' : isAdmin ? 'View and manage department attendance records' : 'View your meeting attendance history')}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
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
            PaperProps={{ sx: { borderRadius: 2 } }}
          >
            <MuiMenuItem onClick={exportCSV} sx={{ gap: 1.5 }}>
              <TableChart sx={{ fontSize: 18, color: "#018e11" }} /> CSV
            </MuiMenuItem>
            <MuiMenuItem onClick={exportPDF} sx={{ gap: 1.5 }}>
              <PictureAsPdf sx={{ fontSize: 18, color: "#f74a4d" }} /> PDF
            </MuiMenuItem>
          </MuiMenu>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
          { label: "No of Meetings", value: totalMeetings, color: "#004497", bg: "#f0f4ff" },
          { label: "Total Attendance", value: stats.total, color: "#004497", bg: "#f0f4ff" },
          { label: "Present", value: stats.present, color: "#2e7d32", bg: "#e8f5e9" },
          { label: "Missed", value: stats.missed, color: "#c62828", bg: "#ffebee" },
          { label: "Excused", value: stats.excused, color: "#f57c00", bg: "#fff3e0" },
        ].map((stat) => (
          <Paper key={stat.label} elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: stat.bg, border: `1px solid ${stat.color}22`, "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography variant="caption" sx={{ color: "#555", fontWeight: 500, mt: 0.5, display: "block" }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", p: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "end" }}>
          <TextField
            size="small"
            placeholder="Search meetings, names, location..."
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
          {(isAdmin || isSystemAdmin) && uniqueNames.length > 0 && (
            <TextField
              select
              size="small"
              label="Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
            >
              <MuiMenuItem value="">All Names</MuiMenuItem>
              {uniqueNames.map(name => (
                <MuiMenuItem key={name} value={name}>{name}</MuiMenuItem>
              ))}
            </TextField>
          )}
          {isSystemAdmin && uniqueDepartments.length > 0 && (
            <TextField
              select
              size="small"
              label="Department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
            >
              <MuiMenuItem value="">All Departments</MuiMenuItem>
              {uniqueDepartments.map(dept => (
                <MuiMenuItem key={dept} value={dept}>{dept}</MuiMenuItem>
              ))}
            </TextField>
          )}
          {uniqueStatuses.length > 0 && (
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 120, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
            >
              <MuiMenuItem value="">All Status</MuiMenuItem>
              {uniqueStatuses.map(status => (
                <MuiMenuItem key={status} value={status}>{status}</MuiMenuItem>
              ))}
            </TextField>
          )}
          <TextField
            type="date"
            size="small"
            label="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
          />
          <TextField
            type="date"
            size="small"
            label="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="small" sx={{ color: "#9ca3af", "&:hover": { color: "#004497" } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden", mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Meeting</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Start</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>End</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Chairperson</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Location</TableCell>
                {(isAdmin || isSystemAdmin) && <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Attendee </TableCell>}
                {isSystemAdmin && <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5 }}>Department</TableCell>}
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5, textAlign: "center" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(isSystemAdmin ? 9 : isAdmin ? 8 : 7)].map((_, j) => (
                      <TableCell key={j}>
                        <Typography sx={{ color: "#e0e0e0", bgcolor: "#f5f5f5", borderRadius: 1, height: 20 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSystemAdmin ? 9 : isAdmin ? 8 : 7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No attendance records found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => {
                  const colors = getStatusColor(record.status);
                  return (
                    <TableRow key={record.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{record.meeting_name}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.start_time}</TableCell>
                      <TableCell>{record.end_time}</TableCell>
                      <TableCell>{record.chairperson}</TableCell>
                      <TableCell>{record.location}</TableCell>
                      {(isAdmin || isSystemAdmin) && <TableCell>{record.name}</TableCell>}
                      {isSystemAdmin && <TableCell><Chip label={record.department || 'N/A'} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem" }} /></TableCell>}
                      <TableCell align="center">
                        <Chip
                          label={record.status}
                          size="small"
                          sx={{
                            borderRadius: 1.5,
                            fontSize: "0.7rem",
                            bgcolor: colors.bg,
                            color: colors.text,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(((page - 1) * ROWS_PER_PAGE) + 1, filteredRecords.length)} to {Math.min(page * ROWS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length}
            </Typography>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, v) => setPage(v)}
                size="small"
                sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 } }}
              />
            )}
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
