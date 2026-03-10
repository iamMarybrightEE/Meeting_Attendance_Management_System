"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  Pagination,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  FilterList,
  Download,
  PictureAsPdf,
  TableChart,
  GetApp,
  Refresh,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { 
  MEETINGS, 
  MEETING_CATEGORIES, 
  MEETING_TYPES, 
  ATTENDANCE_RECORDS,
  ATTENDANCE_STATUS,
  DEPARTMENTS
} from "../../../data/dummyData";

const ROWS_PER_PAGE = 10;

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ReportsPageContent() {
  const { currentUser, users } = useAuth();
  
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    meetingType: "",
    meetingCategory: "",
    department: "",
    staffId: "",
    chairpersonId: "",
    attendanceStatus: "",
  });

  const accessibleMeetings = useMemo(() => {
    let meetings = [...MEETINGS];
    if (currentUser?.role === "Staff") {
      meetings = meetings.filter(m => m.attendeeIds.includes(currentUser.id) || m.chairpersonId === currentUser.id);
    } else if (currentUser?.role === "Chairperson") {
      meetings = meetings.filter(m => m.chairpersonId === currentUser.id);
    }
    return meetings;
  }, [currentUser]);

  const filteredMeetings = useMemo(() => {
    let meetings = [...accessibleMeetings];
    if (filters.dateFrom) meetings = meetings.filter(m => m.date >= filters.dateFrom);
    if (filters.dateTo) meetings = meetings.filter(m => m.date <= filters.dateTo);
    if (filters.meetingType) meetings = meetings.filter(m => m.type === filters.meetingType);
    if (filters.meetingCategory) meetings = meetings.filter(m => m.category === filters.meetingCategory);
    if (filters.chairpersonId) meetings = meetings.filter(m => m.chairpersonId === filters.chairpersonId);
    return meetings;
  }, [accessibleMeetings, filters]);

  const filteredAttendance = useMemo(() => {
    let records = ATTENDANCE_RECORDS.filter(a => filteredMeetings.some(m => m.id === a.meetingId));
    if (filters.staffId) records = records.filter(a => a.userId === filters.staffId);
    if (filters.attendanceStatus) records = records.filter(a => a.status === filters.attendanceStatus);
    return records;
  }, [filteredMeetings, filters]);

  const stats = useMemo(() => {
    const present = filteredAttendance.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length;
    const excused = filteredAttendance.filter(a => a.status === ATTENDANCE_STATUS.EXCUSED).length;
    const missed = filteredAttendance.filter(a => a.status === ATTENDANCE_STATUS.MISSED).length;
    const total = filteredAttendance.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { totalMeetings: filteredMeetings.length, totalRecords: total, present, excused, missed, attendanceRate: rate };
  }, [filteredMeetings, filteredAttendance]);

  const totalPages = Math.ceil(filteredAttendance.length / ROWS_PER_PAGE);
  const paginatedAttendance = filteredAttendance.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({ ...prev, [field]: event.target.value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ dateFrom: "", dateTo: "", meetingType: "", meetingCategory: "", department: "", staffId: "", chairpersonId: "", attendanceStatus: "" });
    setPage(1);
  };

  const handleExport = (format) => {
    setSnackbar({ open: true, message: `${format.toUpperCase()} exported successfully!`, severity: "success" });
  };

  const chairpersons = users.filter(u => u.role === "Chairperson" || u.role === "Admin" || u.role === "System Administrator");

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>
            Reports Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Generate and analyze meeting attendance reports
          </Typography>
        </Box>
       
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
          { label: "Total Meetings", value: stats.totalMeetings, color: "#004497", bg: "#f0f4ff" },
          { label: "Total Records", value: stats.totalRecords, color: "#1a1a2e", bg: "#f3f4f6" },
          { label: "Present", value: stats.present, color: "#2e7d32", bg: "#e8f5e9" },
          { label: "Missed", value: stats.missed, color: "#f74a4d", bg: "#fde8e8" },
          { label: "Excused", value: stats.excused, color: "#856404", bg: "#fff3cd" },
          { label: "Attendance Rate", value: stats.attendanceRate + "%", color: "#004497", bg: "#e8f0fe" },
        ].map((stat) => (
          <Paper key={stat.label} elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: stat.bg, border: `1px solid ${stat.color}22`, transition: "transform 0.2s, box-shadow 0.2s", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography variant="caption" sx={{ color: "#555", fontWeight: 500, mt: 0.5, display: "block" }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden", mb: 3 }}>
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", alignItems: "center", gap: 1 }}>
          <FilterList sx={{ color: "#004497" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1a1a2e" }}>Report Filters</Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={12}>
              <TextField fullWidth label="Date From" type="date" value={filters.dateFrom} onChange={handleFilterChange("dateFrom")} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiOutlinedInput-input": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "1rem" } }} />
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <TextField fullWidth label="Date To" type="date" value={filters.dateTo} onChange={handleFilterChange("dateTo")} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiOutlinedInput-input": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "1rem" } }} />
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiInputLabel-root": { fontSize: "1rem" }, "& .MuiSelect-select": { fontSize: "1rem" } }}>
                <InputLabel sx={{ fontSize: "1rem" }}>Meeting Type</InputLabel>
                <Select value={filters.meetingType} label="Meeting Type" onChange={handleFilterChange("meetingType")}>
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value={MEETING_TYPES.MANAGEMENT}>Management</MenuItem>
                  <MenuItem value={MEETING_TYPES.TEAM}>Team</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiInputLabel-root": { fontSize: "1rem" }, "& .MuiSelect-select": { fontSize: "1rem" } }}>
                <InputLabel sx={{ fontSize: "1rem" }}>Category</InputLabel>
                <Select value={filters.meetingCategory} label="Category" onChange={handleFilterChange("meetingCategory")}>
                  <MenuItem value="">All Categories</MenuItem>
                  <MenuItem value={MEETING_CATEGORIES.INTERNAL}>Internal</MenuItem>
                  <MenuItem value={MEETING_CATEGORIES.EXTERNAL}>External</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiInputLabel-root": { fontSize: "1rem" }, "& .MuiSelect-select": { fontSize: "1rem" } }}>
                <InputLabel sx={{ fontSize: "1rem" }}>Department</InputLabel>
                <Select value={filters.department} label="Department" onChange={handleFilterChange("department")}>
                  <MenuItem value="">All Departments</MenuItem>
                  {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiInputLabel-root": { fontSize: "1rem" }, "& .MuiSelect-select": { fontSize: "1rem" } }}>
                <InputLabel sx={{ fontSize: "1rem" }}>Staff Member</InputLabel>
                <Select value={filters.staffId} label="Staff Member" onChange={handleFilterChange("staffId")}>
                  <MenuItem value="">All Staff</MenuItem>
                  {users.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiInputLabel-root": { fontSize: "1rem" }, "& .MuiSelect-select": { fontSize: "1rem" } }}>
                <InputLabel sx={{ fontSize: "1rem" }}>Chairperson</InputLabel>
                <Select value={filters.chairpersonId} label="Chairperson" onChange={handleFilterChange("chairpersonId")}>
                  <MenuItem value="">All Chairpersons</MenuItem>
                  {chairpersons.map(c => <MenuItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, height: 56 }, "& .MuiInputLabel-root": { fontSize: "1rem" }, "& .MuiSelect-select": { fontSize: "1rem" } }}>
                <InputLabel sx={{ fontSize: "1rem" }}>Attendance Status</InputLabel>
                <Select value={filters.attendanceStatus} label="Attendance Status" onChange={handleFilterChange("attendanceStatus")}>
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value={ATTENDANCE_STATUS.PRESENT}>Present</MenuItem>
                  <MenuItem value={ATTENDANCE_STATUS.EXCUSED}>Excused</MenuItem>
                  <MenuItem value={ATTENDANCE_STATUS.MISSED}>Missed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ display: "flex", gap: 1.5, mt: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={handleClearFilters} sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555", "&:hover": { borderColor: "#004497", color: "#004497" }}}>
              Clear Filters
            </Button>
            <Button variant="contained" startIcon={<Refresh />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)", boxShadow: "0 4px 12px rgba(0,68,151,0.3)", "&:hover": { background: "linear-gradient(135deg, #003380, #1549a0)" } }}>
              Generate Report
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Main Table Card */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(1); }}
          sx={{ px: 2, borderBottom: "1px solid #e8edf3", "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem", minHeight: 44 }, "& .Mui-selected": { color: "#004497", fontWeight: 600 }, "& .MuiTabs-indicator": { bgcolor: "#004497" } }}
        >
          <Tab label="Meeting Attendance Report" />
          <Tab label="Staff Attendance Report" />
          <Tab label="Department Report" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  {["Meeting", "Date", "Staff Name", "Department", "Chairperson", "Status", "Type", "Category"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAttendance.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No records found</Typography></TableCell></TableRow>
                ) : (
                  paginatedAttendance.map((record) => {
                    const meeting = MEETINGS.find(m => m.id === record.meetingId);
                    const user = users.find(u => u.id === record.userId);
                    return (
                      <TableRow key={record.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 500, color: "#1a1a2e" }}>{meeting?.title}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{meeting?.date}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{record.userName}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{user?.department || "-"}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{meeting?.chairpersonName}</Typography></TableCell>
                        <TableCell>
                          <Chip label={record.status} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem", fontWeight: 600, bgcolor: record.status === "Present" ? "#e8f5e9" : record.status === "Excused" ? "#fff3cd" : "#fde8e8", color: record.status === "Present" ? "#2e7d32" : record.status === "Excused" ? "#856404" : "#f74a4d" }} />
                        </TableCell>
                        <TableCell><Typography variant="body2">{meeting?.type}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{meeting?.category}</Typography></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  {["Date", "Meeting", "Chairperson", "Status", "Check-in Time"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAttendance.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No records found</Typography></TableCell></TableRow>
                ) : (
                  paginatedAttendance.map((record) => {
                    const meeting = MEETINGS.find(m => m.id === record.meetingId);
                    return (
                      <TableRow key={record.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                        <TableCell><Typography variant="body2">{meeting?.date}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{meeting?.title}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{meeting?.chairpersonName}</Typography></TableCell>
                        <TableCell>
                          <Chip label={record.status} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem", fontWeight: 600, bgcolor: record.status === "Present" ? "#e8f5e9" : record.status === "Excused" ? "#fff3cd" : "#fde8e8", color: record.status === "Present" ? "#2e7d32" : record.status === "Excused" ? "#856404" : "#f74a4d" }} />
                        </TableCell>
                        <TableCell><Typography variant="body2">{record.checkInTime || "-"}</Typography></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  {["Department", "Meetings", "Present", "Excused", "Missed", "Rate"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {DEPARTMENTS.slice(0, 6).map((dept) => {
                  const deptAttendance = filteredAttendance.filter(a => { const user = users.find(u => u.id === a.userId); return user?.department === dept; });
                  const present = deptAttendance.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length;
                  const total = deptAttendance.length;
                  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                  return (
                    <TableRow key={dept} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{dept}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{stats.totalMeetings}</Typography></TableCell>
                      <TableCell><Chip label={present} size="small" sx={{ borderRadius: 1.5, bgcolor: "#e8f5e9", color: "#2e7d32" }} /></TableCell>
                      <TableCell><Chip label={deptAttendance.filter(a => a.status === ATTENDANCE_STATUS.EXCUSED).length} size="small" sx={{ borderRadius: 1.5, bgcolor: "#fff3cd", color: "#856404" }} /></TableCell>
                      <TableCell><Chip label={deptAttendance.filter(a => a.status === ATTENDANCE_STATUS.MISSED).length} size="small" sx={{ borderRadius: 1.5, bgcolor: "#fde8e8", color: "#f74a4d" }} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 60, height: 6, bgcolor: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
                            <Box sx={{ width: `${rate}%`, height: "100%", bgcolor: rate >= 80 ? "#2e7d32" : rate >= 60 ? "#856404" : "#f74a4d" }} />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{rate}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="body2" color="text.secondary">Showing {((page - 1) * ROWS_PER_PAGE) + 1} to {Math.min(page * ROWS_PER_PAGE, filteredAttendance.length)} of {filteredAttendance.length}</Typography>
            <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} siblingCount={1} boundaryCount={1} size="small" sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 } }} />
          </Box>
        )}
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
