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

export default function MeetingChatWidget({ meetingId, tenantId = "default", uploadVersion = 0, embedded = false }) {
  const [indexStatus, setIndexStatus] = useState("PENDING");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [minutesText, setMinutesText] = useState("");
  const [minutesVisible, setMinutesVisible] = useState(false);

  const canChat = indexStatus === "READY";

  const statusTone = useMemo(() => {
    if (indexStatus === "READY") return "success";
    if (indexStatus === "FAILED") return "error";
    return "info";
  }, [indexStatus]);

  const refreshStatus = async () => {
    if (!meetingId) return;
    try {
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/index/status`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setIndexStatus(data.status || "PENDING");
    } catch {
      setIndexStatus("PENDING");
    }
  };

  useEffect(() => {
    if (!meetingId) return;
    refreshStatus();
    const timer = setInterval(refreshStatus, 7000);
    return () => clearInterval(timer);
  }, [meetingId]);

  useEffect(() => {
    if (uploadVersion > 0) refreshStatus();
  }, [uploadVersion, meetingId]);

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

  const runIndexing = async () => {
    if (!meetingId) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/index`, {
        method: "POST",
        headers: authHeaders(),
        body: "{}",
      });
      if (!res.ok) {
        let detail = "Indexing failed";
        try {
          const err = await res.json();
          if (typeof err.detail === "string") detail = err.detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      await refreshStatus();
    } catch (err) {
      setError(err.message || "Failed to run indexing");
    } finally {
      setActionLoading(false);
    }
  };

  const loadMinutesText = async () => {
    if (!meetingId) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/transcript`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch extracted text");
      }
      const data = await res.json();
      setMinutesText(data.transcript || "");
      setMinutesVisible(true);
    } catch (err) {
      setError(err.message || "Failed to load text");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: embedded ? 2 : 2.5,
        borderRadius: 2,
        border: "1px solid #e8edf3",
        my: embedded ? 0 : 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Meeting assistant (Ollama)
      </Typography>
      <Alert severity={statusTone} sx={{ mb: 2 }}>
        Index status: <strong>{indexStatus}</strong>
        {!canChat
          ? embedded
            ? " — Upload minutes in this panel, then wait for indexing (READY) before chat."
            : " — Upload minutes above, then indexing must finish (READY) before chat."
          : " — Ready to answer from indexed minutes."}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" disabled={actionLoading} onClick={runIndexing}>
          Run indexing
        </Button>
        <Button variant="outlined" disabled={actionLoading} onClick={loadMinutesText}>
          View extracted text
        </Button>
        {actionLoading && <CircularProgress size={18} />}
      </Stack>

      {minutesVisible && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, maxHeight: 180, overflowY: "auto", bgcolor: "#f8fafc", border: "1px solid #e8edf3" }}>
          <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>
            Extracted minutes text
          </Typography>
          <Typography variant="body2">
            {minutesText || "No text loaded yet. Upload a PDF or DOCX on this page first."}
          </Typography>
        </Paper>
      )}

      <Stack spacing={1.5} sx={{ mb: 2, maxHeight: 280, overflowY: "auto", p: 1, bgcolor: "#fafafa", borderRadius: 1.5 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ask questions about this meeting once the index is READY (Ollama must be running).
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
                    Sources: {m.citations.map((c) => `chunk ${c.chunk_id ?? "?"}`).join(", ")}
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
          placeholder={canChat ? "Ask about decisions, action items, or discussion..." : "Waiting for index READY..."}
        />
        <Button variant="contained" disabled={!canChat || loading || !input.trim() || !sessionId} onClick={sendMessage}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Send"}
        </Button>
      </Box>
    </Paper>
  );
}
