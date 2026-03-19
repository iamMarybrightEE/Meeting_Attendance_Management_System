"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box, Typography, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Tabs, Tab, Grid, Avatar, AvatarGroup, Breadcrumbs, Link as MuiLink, Pagination, MenuItem, Snackbar, Alert, Divider, CircularProgress, Menu,
} from "@mui/material";
import {
  ArrowBack, Search, Edit, Delete, Event, AccessTime, LocationOn, Person, Description, Print, GetApp, CheckCircle, Warning, Close, Group, ExpandMore, TableChart, PictureAsPdf,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { canAccessAttendanceConfirmation, isSystemAdmin, isAdmin, isChairperson } from "../../../lib/permissions";
import EditMeetingModal from "../forms/editMeetingModal";
import DeleteMeetingModal from "../forms/deleteMeetingModal";
import AppealReviewModal from "../forms/appealReviewModal";
import AppealModal from "../forms/appealModal";
// import AttendanceConfirmModal from "../forms/attendanceConfirmModal";
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
  
  const [meeting, setMeeting] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [externalParticipants, setExternalParticipants] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [error, setError] = useState(null);

  // const [confirmAttendanceOpen, setConfirmAttendanceOpen] = useState(false);
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appealReviewModalOpen, setAppealReviewModalOpen] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [externalExportAnchor, setExternalExportAnchor] = useState(null);

  const meetingId = params?.id;

  useEffect(() => {
    if (meetingId) {
      fetchMeetingData();
    }
  }, [meetingId]);

  // Poll for appeal status updates in real-time
  useEffect(() => {
    if (!meetingId || !meeting || meeting.status !== 'ended') return;

    const pollAppeals = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/appeals`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
        });
        if (response.ok) {
          const appealsData = await response.json();
          setAppeals((appealsData.appeals || []).filter(a => a));
        }
      } catch (err) {
        console.log('Error polling appeals:', err);
      }
    };

    // Poll every 3 seconds for real-time feedback
    const pollInterval = setInterval(pollAppeals, 3000);
    
    return () => clearInterval(pollInterval);
  }, [meetingId, meeting]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meetings/${meetingId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("Meeting not found.");
        } else if (response.status === 403) {
          setError("You do not have access to this meeting.");
        } else {
          setError("Failed to load meeting details.");
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (!data?.meeting) {
        setError("Meeting data is missing.");
        setMeeting(null);
        setAttendees([]);
        setExternalParticipants([]);
        setAppeals([]);
        setLoading(false);
        return;
      }

      setMeeting(data.meeting);
      setAttendees((data.meeting.meeting_attendees || []).filter(a => a));
      setExternalParticipants((data.meeting.external_participants || []).filter(v => v));
      
      if (data.meeting?.status === 'ended') {
        const appealsResponse = await fetch(`/api/meetings/${meetingId}/appeals`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
        });
        if (appealsResponse.ok) {
          const appealsData = await appealsResponse.json();
          setAppeals((appealsData.appeals || []).filter(a => a));
        }
      } else {
        setAppeals([]);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">{error}</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => router.push("/meetings")} sx={{ mt: 2 }}>Back to Meetings</Button>
      </Box>
    );
  }

  if (!meeting) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Meeting not found</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => router.push("/meetings")} sx={{ mt: 2 }}>Back to Meetings</Button>
      </Box>
    );
  }

  const isOrganizer = currentUser?.id && meeting?.organizer_id?.id && meeting?.organizer_id?.id === currentUser?.id;
  const isChairperson = currentUser?.id && meeting?.chairperson_id?.id && meeting?.chairperson_id?.id === currentUser?.id;
  const canStartMeeting = isOrganizer || isChairperson;
  const canManage = currentUser?.role === "System Administrator" || currentUser?.role === "Admin" || currentUser?.role === "Chairperson" || isOrganizer || isChairperson;
  
  const meetingStatus = meeting?.status;
  
  // Check if current user has already confirmed attendance with present status
  const userAttendanceRecord = attendees.find(a => a.profiles?.id === currentUser?.id);
  const hasConfirmedPresent = userAttendanceRecord?.status === 'present' && userAttendanceRecord?.confirmed_at;
  // const showConfirmButton = meetingStatus === "ongoing" && !hasConfirmedPresent;
  
  // Check if current user is marked as missed
  const userIsMissed = userAttendanceRecord?.status === 'missed';
  
  // Check if current user is a regular attendee (not admin/chairperson/organizer)
  const isRegularAttendee = !canManage && userAttendanceRecord;

  const calculateAttendanceStats = () => {
    const stats = { present: 0, excused: 0, missed: 0, pending: 0, total: attendees.length };
    attendees.forEach(a => {
      if (a.status === 'present') stats.present++;
      else if (a.status === 'excused') stats.excused++;
      else if (a.status === 'missed') stats.missed++;
      else stats.pending++;
    });
    return stats;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    try {
      const [hours, minutes] = timeStr.split(':');
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } catch {
      return timeStr;
    }
  };

  const calculateDuration = () => {
    if (!meeting.start_time || !meeting.end_time) return 0;
    try {
      const [sh, sm] = meeting.start_time.split(':').map(Number);
      const [eh, em] = meeting.end_time.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return endMin - startMin > 0 ? endMin - startMin : 0;
    } catch {
      return 0;
    }
  };

  const attendanceStats = calculateAttendanceStats();

  const filteredAttendees = attendees.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.toLowerCase();
    return name.includes(q);
  });

  const paginatedAttendees = filteredAttendees.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const totalPages = Math.ceil(filteredAttendees.length / ROWS_PER_PAGE);

  const getStatusChip = (status) => {
    const statusMap = {
      'present': { bg: '#e8f5e9', color: '#2e7d32' },
      'excused': { bg: '#fff3cd', color: '#856404' },
      'missed': { bg: '#fde8e8', color: '#f74a4d' },
      'pending': { bg: '#f5f5f5', color: '#6c757d' },
    };
    return statusMap[status?.toLowerCase()] || statusMap['pending'];
  };

  const getAppealStatusChip = (status) => {
    const statusMap = {
      'pending': { bg: '#fff3cd', color: '#856404' },
      'approved': { bg: '#e8f5e9', color: '#2e7d32' },
      'rejected': { bg: '#fde8e8', color: '#f74a4d' },
    };
    return statusMap[status?.toLowerCase()] || statusMap['pending'];
  };

  const handleAppealSubmit = () => {
    setAppealModalOpen(false);
    fetchMeetingData();
  };

  const handleAttendanceSuccess = () => {
    setConfirmAttendanceOpen(false);
    setSelectedAttendance(null);
    fetchMeetingData();
  };

  const handleVisitorSuccess = () => {
    setVisitorModalOpen(false);
    fetchMeetingData();
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    fetchMeetingData();
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    router.push("/meetings");
  };

  const handleAppealReviewSuccess = () => {
    setAppealReviewModalOpen(false);
    setSelectedAppeal(null);
    fetchMeetingData();
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Status", "Check-in Time"];
    const csvData = attendees.map(attendance => [
      `${attendance.profiles?.first_name || ''} ${attendance.profiles?.last_name || ''}`.trim(),
      attendance.status,
      attendance.confirmed_at ? new Date(attendance.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"
    ]);

    const csvContent = [headers, ...csvData].map(row => row.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${meeting.title}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    const exportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const confirmedCount = attendees.filter(a => a.status === "Confirmed").length;
    const pendingCount = attendees.filter(a => a.status === "Pending").length;

    const tableRows = attendees.map(attendance => `
      <tr>
        <td>${attendance.profiles?.first_name || ''} ${attendance.profiles?.last_name || ''}`.trim() + `</td>
        <td>${attendance.status}</td>
        <td>${attendance.confirmed_at ? new Date(attendance.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${meeting.title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1a1a2e; }
          h1 { color: #004497; margin: 0 0 4px 0; font-size: 18px; }
          .meeting-info { background: #f0f4f8; padding: 12px; margin-bottom: 16px; border-radius: 4px; }
          .info-row { display: grid; grid-template-columns: 150px 1fr; margin-bottom: 8px; font-size: 12px; }
          .info-label { color: #6b7280; font-weight: bold; }
          .summary { color: #6b7280; margin-bottom: 16px; font-size: 11px; }
          .stats { margin: 16px 0; padding: 12px; background: #f0f4f8; border-left: 4px solid #004497; }
          .stat-item { display: inline-block; margin-right: 24px; font-size: 12px; }
          .stat-label { color: #6b7280; font-size: 11px; }
          .stat-value { color: #004497; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; }
          th { background: #004497; color: white; padding: 10px; text-align: left; font-weight: bold; font-size: 11px; }
          td { border-bottom: 1px solid #e8edf3; padding: 8px 10px; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>URA MAMS — Attendance Report</h1>
        <div class="meeting-info">
          <div class="info-row"><div class="info-label">Meeting:</div><div>${meeting.title || '—'}</div></div>
          <div class="info-row"><div class="info-label">Date:</div><div>${meeting.date ? new Date(meeting.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : '—'}</div></div>
          <div class="info-row"><div class="info-label">Time:</div><div>${meeting.start_time ? meeting.start_time + ' - ' + (meeting.end_time || '') : '—'}</div></div>
          <div class="info-row"><div class="info-label">Chairperson:</div><div>${meeting.chairperson_id ? (meeting.chairperson_id.first_name + ' ' + meeting.chairperson_id.last_name) : '—'}</div></div>
        </div>
        <p class="summary">Exported on ${exportDate} | Total Attendees: ${attendees.length}</p>
        
        <table>
          <thead>
            <tr>
              <th>Employee</th><th>Status</th><th>Check-in Time</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const exportExternalToCSV = () => {
    const headers = ["Name", "Organization", "Email", "Contact", "Check-in Time"];
    const rows = externalParticipants.map(v => [
      v.full_name || "",
      v.organization || "",
      v.email || "",
      v.phone || v.contact || "",
      v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (v.created_at ? new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "")
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `external_visitors_${meeting.title}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExternalToPDF = () => {
    const printWindow = window.open("", "_blank");
    const exportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    
    const tableRows = externalParticipants.map(v => `
      <tr>
        <td>${v.full_name || "—"}</td>
        <td>${v.organization || "—"}</td>
        <td>${v.email || "—"}</td>
        <td>${v.phone || v.contact || "—"}</td>
        <td>${v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (v.created_at ? new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—")}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>External Visitors Export - ${meeting.title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1a1a2e; }
          h1 { color: #004497; margin: 0 0 4px 0; font-size: 18px; }
          .meeting-info { background: #f0f4f8; padding: 12px; margin-bottom: 16px; border-radius: 4px; }
          .info-row { display: grid; grid-template-columns: 150px 1fr; margin-bottom: 8px; font-size: 12px; }
          .info-label { color: #6b7280; font-weight: bold; }
          .summary { color: #6b7280; margin-bottom: 16px; font-size: 11px; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; }
          th { background: #004497; color: white; padding: 10px; text-align: left; font-weight: bold; font-size: 11px; }
          td { border-bottom: 1px solid #e8edf3; padding: 8px 10px; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>URA MAMS — External Visitors Report</h1>
        <div class="meeting-info">
          <div class="info-row"><div class="info-label">Meeting:</div><div>${meeting.title || '—'}</div></div>
          <div class="info-row"><div class="info-label">Date:</div><div>${meeting.date ? new Date(meeting.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : '—'}</div></div>
        </div>
        <p class="summary">Exported on ${exportDate} | Total Visitors: ${externalParticipants.length}</p>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Organization</th><th>Email</th><th>Contact</th><th>Check-in Time</th>
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
  };

  return (
   
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
        <Breadcrumbs sx={{ mb: 2.5 }}>
            <MuiLink underline="hover" color="inherit" href="#" onClick={() => router.push("/meetings")} sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.875rem" }}>
                <Event sx={{ fontSize: 16 }} />Meetings
            </MuiLink>
            <Typography color="text.primary" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.875rem" }}>{(meeting.title?.length ?? 0) > 40 ? meeting.title.slice(0, 40) + "..." : (meeting.title ?? "Untitled Meeting")} </Typography>
        </Breadcrumbs>
     {/* header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: { xs: "1.2rem", sm: "1.4rem" } }}>{meeting.title ?? "Untitled Meeting"}</Typography> 
                <Chip label={meetingStatus || "N/A"} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem", fontWeight: 600, bgcolor: meetingStatus === "ongoing" ? "#e8f5e9" : meetingStatus === "scheduled" ? "#e3f2fd" : "#f3f4f6", color: meetingStatus === "ongoing" ? "#2e7d32" : meetingStatus === "scheduled" ? "#0b6cc2" : "#4b4c4d" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Meeting ID: {meeting.id}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
          {/* {showConfirmButton && <Button startIcon={<CheckCircle />} variant="contained" onClick={() => {
            setSelectedAttendance(userAttendanceRecord);
            setConfirmAttendanceOpen(true);
          }} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)", "&:hover": { background: "linear-gradient(135deg, #1b5e20, #2e7d32)" } }}>Confirm Attendance</Button>} */}
          
          {(canStartMeeting || canManage) && meetingStatus === "scheduled" && <Button startIcon={<Event />} variant="contained" onClick={async () => {
            try {
              const response = await fetch(`/api/meetings/${meetingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
                body: JSON.stringify({ status: 'ongoing' }),
              });
              if (response.ok) {
                setSnackbar({ open: true, message: "Meeting started!", severity: "success" });
                fetchMeetingData();
              }
            } catch (err) {
              setSnackbar({ open: true, message: err.message, severity: "error" });
            }
          }} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)", "&:hover": { background: "linear-gradient(135deg, #1b5e20, #2e7d32)" } }}>Start Meeting</Button>}

          {(canStartMeeting || canManage) && meetingStatus === "ongoing" && <Button startIcon={<Event />} variant="contained" onClick={async () => {
            try {
              const response = await fetch(`/api/meetings/${meetingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
                body: JSON.stringify({ status: 'ended' }),
              });
              if (response.ok) {
                setSnackbar({ open: true, message: "Meeting ended! Marking absent attendees as missed.", severity: "success" });
                fetchMeetingData();
              }
            } catch (err) {
              setSnackbar({ open: true, message: err.message, severity: "error" });
            }
          }} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #f74a4d 0%, #d32f2f 100%)", "&:hover": { background: "linear-gradient(135deg, #c62828, #b71c1c)" } }}>End Meeting</Button>}

          

          {(isOrganizer || isChairperson || canManage) && meeting?.category === 'external' && <Button startIcon={<Group />} variant="contained" onClick={() => setVisitorModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #6d28d9, #7c3aed)" } }}>Add Visitor</Button>}
          
          {canManage && 
          <>
            <Button startIcon={<Edit />} variant="outlined" size="small" onClick={() => setEditModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", borderColor: "#004497", color: "#004497", "&:hover": { bgcolor: "#f0f4ff" } }}>Edit</Button>
            {meetingStatus !== "ended" && meetingStatus !== "cancelled" && <Button startIcon={<Delete />} variant="outlined" size="small" onClick={() => setDeleteModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", borderColor: "#f74a4d", color: "#f74a4d", "&:hover": { bgcolor: "#fde8e8" } }}>Delete</Button>}
        </>}
        </Box>
      </Box>
      
      {/* Regular Attendee View - Show only their attendance status */}
      {attendees && (
        <>
          {/* meetings stats */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2, mb: 3 }}>
            {[
                { label: "Date", value: formatDate(meeting.date), icon: <Event sx={{ fontSize: 18 }} /> },
                { label: "Time", value: `${formatTime(meeting.start_time)} - ${formatTime(meeting.end_time)}`, sub: `(${calculateDuration()} min)`, icon: <AccessTime sx={{ fontSize: 18 }} /> },
                { label: "Location", value: meeting.location || 'N/A', icon: <LocationOn sx={{ fontSize: 18 }} /> },
                { label: "Chairperson", value: meeting.chairperson_id?.first_name ? `${meeting.chairperson_id.first_name} ${meeting.chairperson_id.last_name}` : 'N/A', icon: <Person sx={{ fontSize: 18 }} /> }
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
          {/* meeting description */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e8edf3", width: "100%", my:2}}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 1, color: "#1a1a2e" }}>
                    <Description sx={{ fontSize: 18, color: "#004497" }} />
                    Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {meeting.description || "No description"}
                </Typography>
            </Paper>
            {/* appeal status */}
            
              {(() => {
                if (meetingStatus !== "ended" && meetingStatus !== "cancelled") return null;
                if (!currentUser?.id) return null;
                // Handle both cases where user_id might be an object or string
                const userAppeal = appeals.find(a => (a.user_id === currentUser.id || a.user_id?.id === currentUser.id));
                if (!userAppeal && !userIsMissed) return null;
                
                if (userAppeal) {
              // If appeal exists, show status and feedback with enhanced styling
              return (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid #e8edf3", mb: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 2,
                  p: 2.5,
                  borderRadius: 2.5,
                  border: `2px solid ${userAppeal.status === 'approved' ? '#4caf50' : userAppeal.status === 'rejected' ? '#f44336' : '#ff9800'}`,
                  bgcolor: userAppeal.status === 'approved' ? '#f1f8e9' : userAppeal.status === 'rejected' ? '#ffebee' : '#fff8e1',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 600 }}>Appeal Status:</Typography>
                    <Chip
                      label={userAppeal.status === 'approved' ? 'Accepted' : userAppeal.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                      sx={{
                        borderRadius: 1.5,
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        bgcolor: userAppeal.status === 'approved' ? '#4caf50' : userAppeal.status === 'rejected' ? '#f44336' : '#ff9800',
                        color: '#fff',
                        minWidth: '120px',
                        justifyContent: 'center'
                      }}
                    />
                  </Box>
                  
                  {userAppeal.status === 'pending' && (
                    <Box sx={{ 
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: '#fff8e1',
                      borderLeft: '4px solid #ff9800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}>
                      <CircularProgress size={20} sx={{ color: '#ff9800' }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: "#666666", fontWeight: 500, display: 'block', mb: 0.25 }}>
                          Under Review
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#555555", fontWeight: 500 }}>
                          Your appeal is being reviewed by the administration.
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {userAppeal.review_notes && (
                    <Box sx={{ 
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: '#f5f5f5',
                      borderLeft: `4px solid ${userAppeal.status === 'approved' ? '#4caf50' : userAppeal.status === 'rejected' ? '#f44336' : '#ff9800'}`
                    }}>
                      <Typography variant="caption" sx={{ color: "#666666", fontWeight: 500, display: 'block', mb: 0.5 }}>
                        Reviewer Feedback:
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#333333", fontWeight: 500 }}>
                        {userAppeal.review_notes}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: '0.75rem' }}>
                      Submitted: {new Date(userAppeal.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    {userAppeal.reviewed_at && (
                      <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: '0.75rem' }}>
                        Reviewed on {new Date(userAppeal.reviewed_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                  </Box>
                </Box>
                </Paper>
              );
            } else if (userIsMissed) {
              return <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid #e8edf3", mb: 3 }}><Button startIcon={<Warning />} variant="contained" onClick={() => setAppealModalOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #f49937 0%, #f0932b 100%)", color: "#fff", "&:hover": { background: "linear-gradient(135deg, #d67a1a, #d67a1a)" } }}>Appeal</Button> </Paper>;
            }
            return null;
          })()}
          {userAttendanceRecord  && (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid #e8edf3", mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 2, color: "#1a1a2e" }}>Your Attendance Status</Typography>
              <Box sx={{ display: "flex", alignItems: "start", gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500, mb: 0.5 }}>Status</Typography>
                  <Chip 
                    label={userAttendanceRecord.status} 
                    sx={{ 
                      borderRadius: 1.5, 
                      fontSize: "0.85rem", 
                      fontWeight: 600,
                      ...getStatusChip(userAttendanceRecord.status)
                    }} 
                  />
                </Box>
                {userAttendanceRecord.confirmed_at && (
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500, mb: 0.5 }}>Check-in Time</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e", backgroundColor: "#f0f4ff", p: 1, borderRadius: 1.5, display: "inline-block" }}>
                      {new Date(userAttendanceRecord.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                )}
                {userAttendanceRecord.notes && (
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500, mb: 0.5 }}>Excuse Reason</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      {userAttendanceRecord.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* shows attendance stats cards */}
      {!isRegularAttendee && (
        <>
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
        </>
      )}  
      
        {/* attendance link section */}
        {(canManage || canAccessAttendanceConfirmation(currentUser, meeting)) && meetingStatus === "ongoing" && meeting?.registration_token && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "2px solid #2e7d32", bgcolor: "#e8f5e9", mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircle sx={{ color: "#2e7d32" }} />
              Attendance Confirmation Link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Share this link with attendees to confirm their attendance:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <TextField 
                fullWidth 
                size="small" 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/attendance/confirm?meeting_id=${meeting.id}&token=${meeting.registration_token}`}
                InputProps={{ readOnly: true }}
                sx={{ flex: 1, minWidth: 300, "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "#fff" } }}
              />
              <Button 
                variant="contained" 
                size="small"
                onClick={() => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/attendance/confirm?meeting_id=${meeting.id}&token=${meeting.registration_token}`;
                  navigator.clipboard.writeText(link);
                    setSnackbar({ open: true, message: "Link copied to clipboard!", severity: "success" });
                  }}
                  sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)", "&:hover": { background: "linear-gradient(135deg, #1b5e20, #2e7d32)" } }}
                  >
                  Copy Link
                  </Button>
                  <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => {
                    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/attendance/confirm?meeting_id=${meeting.id}&token=${meeting.registration_token}`;
                    window.open(link, '_blank');
                    setSnackbar({ open: true, message: "Opening attendance confirmation page...", severity: "success" });
                  }}
                  sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600, background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)", "&:hover": { background: "linear-gradient(135deg, #1b5e20, #2e7d32)" } }}
                  >
                  Open Link
                  </Button>
                </Box>
                </Paper>
              )}
              
              {(!isRegularAttendee || canManage) && (
              <>  
                {/* meeting attendees - only visible to managers/admins/chairperson */}
        <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e8edf3" , my: 2}}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "#1a1a2e" }}>
                    Attendees ({attendees.length})
                </Typography>
                <AvatarGroup max={8} sx={{ justifyContent: "flex-start", "& .MuiAvatar-root": { width: 32, height: 32, fontSize: 11, bgcolor: "#004497" } }}>
                    {attendees.map(attendee => (
                        <Tooltip key={attendee.id} title={`${attendee.profiles?.first_name || ''} ${attendee.profiles?.last_name || ''}`}>
                            <Avatar>
                                {attendee.profiles?.first_name?.[0]}
                                {attendee.profiles?.last_name?.[0]}
                            </Avatar>
                        </Tooltip>
                    ))}
                </AvatarGroup>
            </Paper>
        </Grid>
        {/* tabs and tables - only visible to managers/admins/chairperson */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ px: 2, borderBottom: "1px solid #e8edf3", "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem", minHeight: 44 }, "& .Mui-selected": { color: "#004497", fontWeight: 600 }, "& .MuiTabs-indicator": { bgcolor: "#004497" } }}>
              <Tab label={`Attendance (${attendees.length})`} />
              <Tab label={`Appeals (${appeals.length})`} />
              {meeting?.category === 'external' && <Tab label={`External Visitors (${externalParticipants.length})`} />}
            </Tabs>

            <TabPanel value={tab} index={0}>
              <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <TextField size="small" placeholder="Search attendees..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9ca3af", fontSize: 20 }} /></InputAdornment> }} sx={{ maxWidth: 280, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }} />
                <Box sx={{ display: "flex", gap: 1 }}>
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
                  <Menu
                    anchorEl={exportAnchor}
                    open={Boolean(exportAnchor)}
                    onClose={() => setExportAnchor(null)}
                    PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160 } }}
                  >
                    <MenuItem onClick={() => { exportToCSV(); setExportAnchor(null); }} sx={{ gap: 1.5, fontSize: "0.85rem" }}>
                      <TableChart sx={{ fontSize: 18, color: "#018e11" }} /> Export CSV
                    </MenuItem>
                    <MenuItem onClick={() => { exportToPDF(); setExportAnchor(null); }} sx={{ gap: 1.5, fontSize: "0.85rem" }}>
                      <PictureAsPdf sx={{ fontSize: 18, color: "#f74a4d" }} /> Export PDF
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#f8fafc" }}>{["Employee", "Status", "Check-in Time",].map((h) => <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>{h}</TableCell>)}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedAttendees.length === 0 ? <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                <Typography color="text.secondary">No records</Typography>
                            </TableCell>
                        </TableRow> : paginatedAttendees.map((attendance) => {
                          const statusChip = getStatusChip(attendance.status);
                          return <TableRow key={attendance.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                            <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a1a2e" }}>{attendance.profiles?.first_name} {attendance.profiles?.last_name}</Typography>
                            </TableCell>
                            <TableCell>
                                <Chip label={attendance.status} size="small" sx={{ borderRadius: 1.5, fontSize: "0.7rem", fontWeight: 600, bgcolor: statusChip.bg, color: statusChip.color }} />
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">{attendance.confirmed_at ? new Date(attendance.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</Typography>
                            </TableCell>
                        </TableRow>;
                        })}
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
                    {Math.min(page * ROWS_PER_PAGE, filteredAttendees.length)} of{" "}
                    {filteredAttendees.length}
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
              {meetingStatus !== "ended" ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography color="text.secondary">Appeals become available after meeting ends</Typography>
                </Box>
              ) : appeals.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography color="text.secondary">No appeals submitted</Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                  {appeals.map((appeal) => {
                    const statusChip = getAppealStatusChip(appeal.status);
                    return (
                      <Paper key={appeal.id} elevation={0} sx={{ p: 2, border: "1px solid #e8edf3", borderRadius: 2, bgcolor: statusChip.bg + "22", "&:hover": { bgcolor: statusChip.bg + "40" } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1a1a2e", mb: 0.5 }}>
                              {appeal.profiles?.first_name} {appeal.profiles?.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {appeal.reason}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                              <Chip
                                label={appeal.status}
                                size="small"
                                sx={{
                                  borderRadius: 1.5,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  bgcolor: statusChip.bg,
                                  color: statusChip.color,
                                }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                Submitted: {formatDate(appeal.created_at)}
                              </Typography>
                              {appeal.document_url && (
                                <Tooltip title="View uploaded document">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    href={appeal.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      textTransform: "none",
                                      borderRadius: 1.5,
                                      fontSize: "0.7rem",
                                      borderColor: "#004497",
                                      color: "#004497",
                                      "&:hover": { bgcolor: "#f0f4ff" }
                                    }}
                                  >
                                    📎 View Document
                                  </Button>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                          {canManage && appeal.status === "pending" && (
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
                                fontSize: "0.7rem",
                                "&:hover": {
                                  background: "linear-gradient(135deg, #004497 0%, #002e7a 100%)",
                                }
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </Box>
                        {appeal.review_notes && appeal.status !== "pending" && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e8edf3", bgcolor: "#fff", p: 1.5, borderRadius: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280" }}>
                              Admin Feedback:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {appeal.review_notes}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tab} index={meeting?.category === 'external' ? 2 : -1}>
              <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>External Visitors</Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    startIcon={<GetApp />}
                    endIcon={<ExpandMore />}
                    variant="outlined"
                    size="small"
                    onClick={(e) => setExternalExportAnchor(e.currentTarget)}
                    sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555", "&:hover": { borderColor: "#004497", color: "#004497" } }}
                  >
                    Export
                  </Button>
                  <Menu
                    anchorEl={externalExportAnchor}
                    open={Boolean(externalExportAnchor)}
                    onClose={() => setExternalExportAnchor(null)}
                    PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160 } }}
                  >
                    <MenuItem onClick={() => { exportExternalToCSV(); setExternalExportAnchor(null); }} sx={{ gap: 1.5, fontSize: "0.85rem" }}>
                      <TableChart sx={{ fontSize: 18, color: "#018e11" }} /> Export CSV
                    </MenuItem>
                    <MenuItem onClick={() => { exportExternalToPDF(); setExternalExportAnchor(null); }} sx={{ gap: 1.5, fontSize: "0.85rem" }}>
                      <PictureAsPdf sx={{ fontSize: 18, color: "#f74a4d" }} /> Export PDF
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                      {["Name", "Organization", "Email", "Contact", "Check-in Time"].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {externalParticipants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No visitors</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      externalParticipants.map((visitor) => {
                        return (
                          <TableRow key={visitor.id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a1a2e" }}>
                                {visitor.full_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{visitor.organization || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{visitor.email || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{visitor.phone || visitor.contact || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {visitor.check_in_time ? new Date(visitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (visitor.created_at ? new Date(visitor.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Paper>
        </>
        
      )}

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
        existingAppeal={appeals.find(a => (a.user_id === currentUser.id || a.user_id?.id === currentUser.id))}
      />

      {/* ATTENDANCE CONFIRM Modal */}
      {/* <AttendanceConfirmModal
        open={confirmAttendanceOpen}
        onClose={() => setConfirmAttendanceOpen(false)}
        attendance={selectedAttendance}
        meeting={meeting}
        onSuccess={handleAttendanceSuccess}
      /> */}

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
          meetingId={meetingId}
          onSuccess={handleAppealReviewSuccess}
        />
      )}
    </Box>
    
  );
}
