"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box, Typography, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, Tabs, Tab, Grid, Avatar, AvatarGroup, Breadcrumbs, Link as MuiLink, Pagination,
  Dialog, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, Divider,
} from "@mui/material";
import {
  ArrowBack, Search, Edit, Delete, Event, AccessTime, LocationOn, Person, Description, Print, GetApp, CheckCircle, Warning, Close, Group,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { MEETINGS, MEETING_STATUS, ATTENDANCE_STATUS, ATTENDANCE_RECORDS, APPEALS, APPEAL_STATUS, EXTERNAL_VISITORS } from "../../../data/dummyData";
import EditMeetingModal from "..//forms/editMeetingModal";
import DeleteMeetingModal from "../forms/deleteMeetingModal";
import AppealReviewModal from "../forms/appealReviewModal";
import AppealModal from "../forms/appealModal";
import AttendanceConfirmModal from "../forms/attendanceConfirmModal";
import ExternalVisitorModal from "../forms/externalVisitorModal";

const ROWS_PER_PAGE = 8;

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function MeetingDetailsPageContent() {
  const router = useRouter();
  const params = useParams();
  const { users, currentUser } = useAuth();
  
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [confirmAttendanceOpen, setConfirmAttendanceOpen] = useState(false);
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appealReviewModalOpen, setAppealReviewModalOpen] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [appealReason, setAppealReason] = useState("");
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  const meetingId = params?.id;
  const meeting = MEETINGS.find(m => m.id === meetingId);

  const meetingAttendance = useMemo(() => {
    if (!meeting) return [];
    let records = ATTENDANCE_RECORDS.filter(a => a.meetingId === meeting.id);
    if (search) { const q = search.toLowerCase(); records = records.filter(a => a.userName.toLowerCase().includes(q)); }
    return records;
  }, [meeting, search]);

  const paginatedAttendance = meetingAttendance.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const totalPages = Math.ceil(meetingAttendance.length / ROWS_PER_PAGE);
  const meetingAppeals = meeting ? APPEALS.filter(a => a.meetingId === meeting.id) : [];
  const meetingVisitors = meeting ? EXTERNAL_VISITORS.filter(v => v.meetingId === meeting.id) : [];
  const attendeeUsers = meeting ? meeting.attendeeIds.map(id => users.find(u => u.id === id)).filter(Boolean) : [];

  const attendanceStats = useMemo(() => {
    if (!meeting) return { present: 0, excused: 0, missed: 0, pending: 0, total: 0 };
    const stats = {
      present: meetingAttendance.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length,
      excused: meetingAttendance.filter(a => a.status === ATTENDANCE_STATUS.EXCUSED).length,
      missed: meetingAttendance.filter(a => a.status === ATTENDANCE_STATUS.MISSED).length,
      pending: meetingAttendance.filter(a => a.status === ATTENDANCE_STATUS.PENDING).length,
    };
    stats.total = stats.present + stats.excused + stats.missed + stats.pending;
    return stats;
  }, [meeting, meetingAttendance]);

  if (!meeting) { 
    return (
        <DashboardLayout>
            <Box sx={{ p: 3 }}>
                <Typography variant="h5">Meeting not found</Typography>
                <Button startIcon={<ArrowBack />} onClick={() => router.push("/meetings")} sx={{ mt: 2 }}>Back to Meetings</Button>
            </Box>
        </DashboardLayout>
    )
    
    }

  const canManage = currentUser?.role === "System Administrator" || currentUser?.role === "Admin" || currentUser?.role === "Chairperson";
//   const isAttendee = meeting.attendeeIds.includes(currentUser?.id);
  const showConfirmButton = (meeting.status === "Scheduled" || meeting.status === "Ongoing") 
//   && isAttendee
  ;

  const handleAttendanceSuccess = () => { 
    setConfirmAttendanceOpen(false); 
    setSelectedAttendance(null);
    setSnackbar({ open: true, message: "Attendance confirmed successfully!", severity: "success" }); 
  };
  const handleAppealSubmit = () => { 
    setAppealModalOpen(false); 
    setAppealReason(""); 
    setSnackbar({ open: true, message: "Appeal submitted!", severity: "success" }); 
  };
  const handleVisitorSuccess = () => { 
    setVisitorModalOpen(false); 
    setSnackbar({ open: true, message: "Visitor registered!", severity: "success" }); 
  };
  const handleEditSuccess = () => { 
    setEditModalOpen(false); 
    setSnackbar({ open: true, message: "Meeting updated successfully!", severity: "success" }); 
};
  const handleDeleteSuccess = () => { 
    setDeleteModalOpen(false); 
    router.push("/meetings"); 
    setSnackbar({ open: true, message: "Meeting deleted successfully!", severity: "success" }); 
};
  const handleAppealReviewSuccess = () => { 
    setAppealReviewModalOpen(false); 
    setSelectedAppeal(null); 
    setSnackbar({ open: true, message: "Appeal reviewed successfully!", severity: "success" }); 
};

  return (
   
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
        <Breadcrumbs sx={{ mb: 2.5 }}>
            <MuiLink underline="hover" color="inherit" href="#" onClick={() => router.push("/meetings")} sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.875rem" }}>
                <Event sx={{ fontSize: 16 }} />Meetings
            </MuiLink>
            <Typography color="text.primary" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.875rem" }}>{meeting.title.length > 40 ? meeting.title.slice(0, 40) + "..." : meeting.title} </Typography>
        </Breadcrumbs>
     {/* header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>{meeting.title}</Typography> 
                <Chip label={meeting.status} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem", fontWeight: 600, bgcolor: meeting.status === "Ongoing" ? "#e8f5e9" : meeting.status === "Scheduled" ? "#e3f2fd" : "#f3f4f6", color: meeting.status === "Ongoing" ? "#2e7d32" : meeting.status === "Scheduled" ? "#0b6cc2" : "#4b4c4d" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Meeting ID: {meeting.id}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
          {showConfirmButton && <Button startIcon={<CheckCircle />} variant="contained" onClick={() => {
            const userAttendance = meetingAttendance.find(a => a.userId === currentUser?.id);
            setSelectedAttendance(userAttendance);
            setConfirmAttendanceOpen(true);
          }} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)", "&:hover": { background: "linear-gradient(135deg, #1b5e20, #2e7d32)" } }}>Confirm Attendance</Button>}
          
          <Button startIcon={<Warning />} variant="contained" onClick={() => setAppealModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #f49937 0%, #f0932b 100%)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #d67a1a, #d67a1a)" } }}>Appeal</Button>

          {canManage && <Button startIcon={<Group />} variant="contained" onClick={() => setVisitorModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #6d28d9, #7c3aed)" } }}>Add Visitor</Button>}
          
          {canManage && 
          <>
            <Button startIcon={<Edit />} variant="outlined" size="small" onClick={() => setEditModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", borderColor: "#004497", color: "#004497", "&:hover": { bgcolor: "#f0f4ff" } }}>Edit</Button>
            <Button startIcon={<Delete />} variant="outlined" size="small" onClick={() => setDeleteModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", borderColor: "#f74a4d", color: "#f74a4d", "&:hover": { bgcolor: "#fde8e8" } }}>Delete</Button>
        </>}
        </Box>
      </Box>
            {/* meetings stats */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2, mb: 3 }}>
        {[
            { label: "Date", value: meeting.date, icon: <Event sx={{ fontSize: 18 }} /> },
            { label: "Time", value: `${meeting.startTime} - ${meeting.endTime}`, sub: `(${meeting.duration} min)`, icon: <AccessTime sx={{ fontSize: 18 }} /> },
            { label: "Location", value: meeting.location, icon: <LocationOn sx={{ fontSize: 18 }} /> },
            { label: "Chairperson", value: meeting.chairpersonName, icon: <Person sx={{ fontSize: 18 }} /> }
        ].map((item) => (
            <Paper key={item.label} elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e8edf3" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Box sx={{ color: "#004497" }}>{item.icon}</Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500 }}>
                        {item.label}
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                    {item.value}
                </Typography>
                {item.sub && (
                    <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                        {item.sub}
                    </Typography>
                )}
            </Paper>
        ))}
      </Box>
        {/* attendance stats */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2, mb: 3 }}>
        {[
            { label: "Present", value: attendanceStats.present, color: "#2e7d32", bg: "#e8f5e9" },
            { label: "Excused", value: attendanceStats.excused, color: "#856404", bg: "#fff3cd" },
            { label: "Missed", value: attendanceStats.missed, color: "#f74a4d", bg: "#fde8e8" },
            { label: "Rate", value: attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) + "%" : "0%", color: "#004497", bg: "#f0f4ff" }
        ].map((stat) => (
            <Paper key={stat.label} elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: stat.bg, border: `1px solid ${stat.color}22` }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                    {stat.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#555", fontWeight: 500, mt: 0.5, display: "block" }}>
                    {stat.label}
                </Typography>
            </Paper>
        ))}
      </Box>
        {/* meeting decription */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e8edf3" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 1, color: "#1a1a2e" }}>
                    <Description sx={{ fontSize: 18, color: "#004497" }} />
                    Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {meeting.description || "No description"}
                </Typography>
            </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e8edf3" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "#1a1a2e" }}>
                    Attendees ({attendeeUsers.length})
                </Typography>
                <AvatarGroup max={8} sx={{ justifyContent: "flex-start", "& .MuiAvatar-root": { width: 32, height: 32, fontSize: 11, bgcolor: "#004497" } }}>
                    {attendeeUsers.map(user => (
                        <Tooltip key={user.id} title={`${user.firstName} ${user.lastName}`}>
                            <Avatar>
                                {user.firstName?.[0]}
                                {user.lastName?.[0]}
                            </Avatar>
                        </Tooltip>
                    ))}
                </AvatarGroup>
            </Paper>
        </Grid>
      </Grid>
        {/* tabs and tables */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ px: 2, borderBottom: "1px solid #e8edf3", "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem", minHeight: 44 }, "& .Mui-selected": { color: "#004497", fontWeight: 600 }, "& .MuiTabs-indicator": { bgcolor: "#004497" } }}>
          <Tab label={`Attendance (${meetingAttendance.length})`} />
          <Tab label={`Appeals (${meetingAppeals.length})`} />
          <Tab label={`External Visitors (${meetingVisitors.length})`} />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <TextField size="small" placeholder="Search attendees..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9ca3af", fontSize: 20 }} /></InputAdornment> }} sx={{ maxWidth: 280, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }} />
          </Box>
          <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>{["Employee", "Status", "Check-in Time", "Excuse Reason"].map((h) => <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>{h}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedAttendance.length === 0 ? <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">No records</Typography>
                        </TableCell>
                    </TableRow> : paginatedAttendance.map((attendance) => (<TableRow key={attendance.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                        <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a1a2e" }}>{attendance.userName}</Typography>
                        </TableCell>
                        <TableCell>
                            <Chip label={attendance.status} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem", fontWeight: 600, bgcolor: attendance.status === "Present" ? "#e8f5e9" : attendance.status === "Excused" ? "#fff3cd" : attendance.status === "Missed" ? "#fde8e8" : "#f5f5f5", color: attendance.status === "Present" ? "#2e7d32" : attendance.status === "Excused" ? "#856404" : attendance.status === "Missed" ? "#f74a4d" : "#6c757d" }} />
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2">{attendance.checkInTime || "-"}</Typography>
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2">{attendance.excuseReason || "-"}</Typography>
                        </TableCell>
                    </TableRow>))}
                </TableBody>
            </Table>
        </TableContainer>
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
                {Math.min(page * ROWS_PER_PAGE, meetingAttendance.length)} of{" "}
                {meetingAttendance.length}
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
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  {["Employee", "Reason", "Status", "Submitted", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {meetingAppeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No appeals</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  meetingAppeals.map((appeal) => (
                    <TableRow key={appeal.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a1a2e" }}>
                          {appeal.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {appeal.userId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 250 }}>
                          {appeal.reason.length > 60 ? `${appeal.reason.slice(0, 60)}...` : appeal.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appeal.status}
                          size="small"
                          sx={{
                            borderRadius: 1.5,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            bgcolor: appeal.status === "Validated" ? "#e8f5e9" : appeal.status === "Invalidated" ? "#fde8e8" : "#fff3cd",
                            color: appeal.status === "Validated" ? "#2e7d32" : appeal.status === "Invalidated" ? "#f74a4d" : "#856404",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {mounted ? new Date(appeal.submittedAt).toLocaleDateString() : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <Button
                            size="small"
                            startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                            onClick={() => {
                              setSelectedAppeal(appeal);
                              setAppealReviewModalOpen(true);
                            }}
                            sx={{ 
                              textTransform: "none", 
                              borderRadius: 1.5,
                              fontWeight: 600,
                              background: "linear-gradient(135deg, #0b6cc2 0%, #004497 100%)",
                              color: "#fff",
                              "&:hover": { 
                                background: "linear-gradient(135deg, #004497 0%, #002e7a 100%)",
                                boxShadow: "0 4px 12px rgba(4, 68, 151, 0.3)"
                              }
                            }}
                          >
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
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
                  {["Name", "Organization", "Email", "Phone", "Registered"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {meetingVisitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No visitors</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  meetingVisitors.map((visitor) => (
                    <TableRow key={visitor.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {visitor.firstName} {visitor.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{visitor.organization}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{visitor.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{visitor.phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {mounted ? new Date(visitor.registeredAt).toLocaleDateString() : "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

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

      {/* APPEAL Modal  */}
      <AppealModal
        open={appealModalOpen}
        onClose={() => setAppealModalOpen(false)}
        meeting={meeting}
        onSubmit={handleAppealSubmit}
      />

      {/* ATTENDANCE CONFIRM Modal */}
      <AttendanceConfirmModal
        open={confirmAttendanceOpen}
        onClose={() => setConfirmAttendanceOpen(false)}
        attendance={selectedAttendance}
        meeting={meeting}
        onSuccess={handleAttendanceSuccess}
      />

      {/* EXTERNAL VISITOR Modal */}
      <ExternalVisitorModal
        open={visitorModalOpen}
        onClose={() => setVisitorModalOpen(false)}
        meeting={meeting}
        onSuccess={handleVisitorSuccess}
      />

      {/* EDIT MEETING Modal */}
      <EditMeetingModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        selectedMeeting={meeting}
        onSuccess={handleEditSuccess}
      />

      {/* DELETE MEETING Modal */}
      <DeleteMeetingModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        selectedMeeting={meeting}
        onSubmit={handleDeleteSuccess}
      />

      {/* APPEAL REVIEW Modal */}
      {selectedAppeal && (
        <AppealReviewModal
          open={appealReviewModalOpen}
          onClose={() => { setAppealReviewModalOpen(false); setSelectedAppeal(null); }}
          appeal={selectedAppeal}
          onSuccess={handleAppealReviewSuccess}
        />
      )}
    </Box>
    
  );
}
