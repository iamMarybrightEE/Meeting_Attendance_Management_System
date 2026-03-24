"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Divider, Paper, Stack, TextField, Typography } from "@mui/material";

const baseUrl = process.env.NEXT_PUBLIC_MEETING_AGENT_URL || "http://localhost:8100";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("mams_access_token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };
}

function authOnlyHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("mams_access_token") : "";
  return { Authorization: `Bearer ${token || ""}` };
}

export default function MeetingChatWidget({ meetingId, tenantId = "default" }) {
  const [indexStatus, setIndexStatus] = useState("PENDING");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const fileInputRef = useRef(null);

  const canChat = indexStatus === "READY";

  const statusTone = useMemo(() => {
    if (indexStatus === "READY") return "success";
    if (indexStatus === "FAILED") return "error";
    return "info";
  }, [indexStatus]);

  useEffect(() => {
    if (!meetingId) return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/index/status`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setIndexStatus(data.status || "PENDING");
      } catch {
        setIndexStatus("PENDING");
      }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 7000);
    return () => clearInterval(timer);
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId || !canChat || sessionId) return;
    const createSession = async () => {
      try {
        const res = await fetch(`${baseUrl}/v1/chat/sessions`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ meeting_id: meetingId, tenant_id: tenantId }),
        });
        if (!res.ok) {
          throw new Error("Failed to initialize chat session");
        }
        const data = await res.json();
        setSessionId(data.session_id);
      } catch (err) {
        setError(err.message || "Failed to initialize chat");
      }
    };
    createSession();
  }, [meetingId, tenantId, canChat, sessionId]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    setLoading(true);
    setError("");
    const outgoing = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: outgoing }]);
    try {
      const res = await fetch(`${baseUrl}/v1/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: outgoing }),
      });
      if (!res.ok) {
        throw new Error("Failed to get response from meeting agent");
      }
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations || [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Could not send message");
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/index/status`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setIndexStatus(data.status || "PENDING");
  };

  const uploadRecording = async (file) => {
    if (!file || !meetingId) return;
    setActionLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/recordings`, {
        method: "POST",
        headers: authOnlyHeaders(),
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      await refreshStatus();
    } catch (err) {
      setError(err.message || "Failed to upload recording");
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const runIndexing = async () => {
    if (!meetingId) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/index`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        throw new Error("Indexing failed");
      }
      await refreshStatus();
    } catch (err) {
      setError(err.message || "Failed to start indexing");
    } finally {
      setActionLoading(false);
    }
  };

  const loadTranscript = async () => {
    if (!meetingId) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/transcript`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch transcript");
      }
      const data = await res.json();
      setTranscript(data.transcript || "");
      setTranscriptVisible(true);
    } catch (err) {
      setError(err.message || "Failed to load transcript");
    } finally {
      setActionLoading(false);
    }
  };

  const saveManualTranscript = async () => {
    if (!meetingId || !manualTranscript.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/transcript/manual`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          transcript: manualTranscript.trim(),
          tenant_id: tenantId,
          title: `Meeting ${meetingId}`,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save manual transcript");
      }
      const data = await res.json();
      setTranscript(data.transcript || "");
      setTranscriptVisible(true);
      await refreshStatus();
    } catch (err) {
      setError(err.message || "Failed to save manual transcript");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid #e8edf3", my: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Meeting Agent (RAG Chat)
      </Typography>
      <Alert severity={statusTone} sx={{ mb: 2 }}>
        Index status: <strong>{indexStatus}</strong>
        {!canChat ? " — Transcription/indexing still processing." : " — Ready to answer from transcript."}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" disabled={actionLoading} onClick={() => fileInputRef.current?.click()}>
          Upload Audio
        </Button>
        <Button variant="outlined" disabled={actionLoading} onClick={runIndexing}>
          Run Indexing
        </Button>
        <Button variant="outlined" disabled={actionLoading} onClick={loadTranscript}>
          View Transcript
        </Button>
        {actionLoading && <CircularProgress size={18} />}
      </Stack>
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: "#f8fafc", border: "1px dashed #d0d7de" }}>
        <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
          Manual transcript (for testing when audio transcription fails)
        </Typography>
        <TextField
          multiline
          minRows={3}
          fullWidth
          size="small"
          value={manualTranscript}
          onChange={(e) => setManualTranscript(e.target.value)}
          placeholder="Paste meeting transcript text here..."
          sx={{ mb: 1 }}
        />
        <Button variant="contained" disabled={actionLoading || !manualTranscript.trim()} onClick={saveManualTranscript}>
          Save Manual Transcript
        </Button>
      </Paper>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => uploadRecording(e.target.files?.[0])}
      />

      {transcriptVisible && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, maxHeight: 180, overflowY: "auto", bgcolor: "#f8fafc", border: "1px solid #e8edf3" }}>
          <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>
            Transcript
          </Typography>
          <Typography variant="body2">
            {transcript || "Transcript is not ready yet. Upload recording and run indexing first."}
          </Typography>
        </Paper>
      )}

      <Stack spacing={1.5} sx={{ mb: 2, maxHeight: 280, overflowY: "auto", p: 1, bgcolor: "#fafafa", borderRadius: 1.5 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ask questions about this meeting once the index is ready.
          </Typography>
        )}
        {messages.map((m, idx) => (
          <Box key={`${m.role}-${idx}`} sx={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <Paper sx={{ p: 1.2, bgcolor: m.role === "user" ? "#e3f2fd" : "#fff", border: "1px solid #e8edf3" }} elevation={0}>
              <Typography variant="body2">{m.content}</Typography>
              {m.citations?.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Sources: {m.citations.map((c) => `chunk ${c.chunk_id}`).join(", ")}
                  </Typography>
                </>
              )}
            </Paper>
          </Box>
        ))}
      </Stack>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          disabled={!canChat || loading || !sessionId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder={canChat ? "Ask about decisions, action items, or attendees..." : "Waiting for transcript index..."}
        />
        <Button variant="contained" disabled={!canChat || loading || !input.trim() || !sessionId} onClick={sendMessage}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Send"}
        </Button>
      </Box>
    </Paper>
  );
}
