"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { CheckCircle, Error as ErrorIcon, Event, AccessTime, LocationOn } from "@mui/icons-material";

export default function AttendanceConfirmPageContent({ meetingId, token }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        setLoading(true);
        setError("");

        if (!meetingId || !token) {
          setError("Invalid attendance link. Missing meeting ID or token.");
          setLoading(false);
          return;
        }

        const token_str = localStorage.getItem("mams_access_token");
        if (!token_str) {
          setError("You must be logged in to confirm attendance. Please log in first.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/meetings/${meetingId}`,
          {
            headers: {
              "Authorization": `Bearer ${token_str}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Meeting not found.");
          } else if (response.status === 401) {
            setError("Your session has expired. Please log in again.");
          } else {
            setError("Failed to load meeting details.");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        const meetingData = data.meeting;

        if (meetingData.registration_token !== token) {
          setError("Invalid or expired token. This link may no longer be valid.");
          setLoading(false);
          return;
        }

        // Verify the current user is in the attendees list
        if (currentUser) {
          const userIsAttendee = meetingData.meeting_attendees?.some(
            (attendee) => attendee.user_id === currentUser?.id
          );

          if (!userIsAttendee) {
            setError(
              "You are not registered as an attendee for this meeting. Only registered attendees can confirm attendance."
            );
            setLoading(false);
            return;
          }
        }

        if (meetingData.status !== "ongoing") {
          setError(
            `This meeting is ${meetingData.status}. Attendance can only be confirmed for ongoing meetings.`
          );
          setLoading(false);
          return;
        }

        // Check if user has already confirmed attendance
        if (currentUser) {
          const currentUserAttendance = meetingData.meeting_attendees?.find(
            (a) => a.user_id === currentUser?.id
          );
          if (currentUserAttendance && currentUserAttendance.status === "present") {
            setError("You have already confirmed your attendance for this meeting.");
            setLoading(false);
            return;
          }
        }

        setMeeting(meetingData);
        setLoading(false);
      } catch (err) {
        setError(err.message || "An error occurred while loading the meeting.");
        setLoading(false);
      }
    };

    validateToken();
  }, [meetingId, token, currentUser?.id]);

  const handleConfirmAttendance = async () => {
    try {
      setSubmitting(true);
      setError("");

      const token_str = localStorage.getItem("mams_access_token");
      if (!token_str) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      const response = await fetch(
        `/api/meetings/${meetingId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token_str}`,
          },
          body: JSON.stringify({
            status: "present",
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to confirm attendance.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/meetings/${meetingId}`);
      }, 2500);
    } catch (err) {
      setError(err.message || "An error occurred while confirming attendance.");
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
        {loading ? (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "300px",
              flexDirection: "column",
              gap: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <CircularProgress size={48} sx={{ color: "#004497" }} />
            <Typography color="#64748b" sx={{ fontWeight: 500 }}>Loading meeting details...</Typography>
          </Paper>
        ) : success ? (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              textAlign: "center",
              background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
              border: "2px solid #2e7d32",
              backdropFilter: "blur(10px)",
            }}
          >
            <CheckCircle sx={{ fontSize: 72, color: "#2e7d32", mb: 3 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "#1b5e20" }}>
              Attendance Confirmed!
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#2e7d32", mb: 3, fontWeight: 500 }}
            >
              Your attendance has been recorded successfully.
            </Typography>
            <Typography variant="body2" sx={{ color: "#558b2f", opacity: 0.8 }}>
              Redirecting you back to meetings...
            </Typography>
          </Paper>
        ) : error ? (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              textAlign: "center",
              background: error.includes("already confirmed") 
                ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
                : "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
              border: error.includes("already confirmed") 
                ? "2px solid #2e7d32"
                : "2px solid #c62828",
              backdropFilter: "blur(10px)",
            }}
          >
            {error.includes("already confirmed") ? (
              <>
                <CheckCircle sx={{ fontSize: 72, color: "#2e7d32", mb: 3 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: "#1b5e20" }}>
                  Already Confirmed
                </Typography>
                <Typography variant="body1" sx={{ color: "#1b5e20", mb: 4, lineHeight: 1.6 }}>
                  You've already confirmed your attendance for this meeting.
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => router.push(`/meetings/${meetingId}`)}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      py: 1.5,
                      background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)",
                      boxShadow: "0 4px 12px rgba(46, 125, 50, 0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
                      },
                    }}
                  >
                    View Meeting Details
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => router.push("/meetings")}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      py: 1.5,
                      borderColor: "#2e7d32",
                      color: "#2e7d32",
                      "&:hover": { 
                        bgcolor: "rgba(46, 125, 50, 0.05)",
                        borderColor: "#1b5e20",
                        color: "#1b5e20",
                      },
                    }}
                  >
                    Back to Meetings
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <ErrorIcon sx={{ fontSize: 72, color: "#c62828", mb: 3 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: "#b71c1c" }}>
                  Cannot Confirm Attendance
                </Typography>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2, textAlign: "left" }}>
                  {error}
                </Alert>
                <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => router.push("/meetings")}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      py: 1.5,
                      background: "linear-gradient(135deg, #f74a4d 0%, #d32f2f 100%)",
                      boxShadow: "0 4px 12px rgba(244, 74, 77, 0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
                      },
                    }}
                  >
                    Back to Meetings
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        ) : meeting ? (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#f8fafc",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, color: "#1a1a2e", textAlign: "center" }}>
              Confirm Your Attendance
            </Typography>

            <Box sx={{ mb: 4, p: 3, bgcolor: "#fff", borderRadius: 2, border: "1px solid #e2e8f0" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: "#1a1a2e" }}>
                {meeting.title}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Event sx={{ color: "#004497", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      {meeting.date}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <AccessTime sx={{ color: "#004497", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>Time</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      {meeting.start_time} - {meeting.end_time}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <LocationOn sx={{ color: "#004497", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>Location</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      {meeting.location || "N/A"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Typography variant="body2" sx={{ mb: 3, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
              By clicking below, you confirm that you are physically present at this meeting location.
            </Typography>

            <Button
              fullWidth
              variant="contained"
              onClick={handleConfirmAttendance}
              disabled={submitting}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                py: 1.5,
                fontSize: "1rem",
                background: "linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)",
                boxShadow: "0 4px 12px rgba(46, 125, 50, 0.3)",
                "&:hover": {
                  background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
                  boxShadow: "0 6px 16px rgba(46, 125, 50, 0.4)",
                },
                "&:disabled": {
                  opacity: 0.6,
                },
              }}
            >
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: "#fff" }} />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle sx={{ mr: 1, fontSize: 20 }} />
                  Confirm Attendance
                </>
              )}
            </Button>
          </Paper>
        ) : null}
      </Box>
    </Container>
  );
}
