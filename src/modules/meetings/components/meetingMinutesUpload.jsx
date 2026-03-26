"use client";

import { useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { Description } from "@mui/icons-material";

const baseUrl = process.env.NEXT_PUBLIC_MEETING_AGENT_URL || "http://localhost:8100";

function authOnlyHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("mams_access_token") : "";
  return { Authorization: `Bearer ${token || ""}` };
}

export default function MeetingMinutesUpload({ meetingId, onDone, embedded = false }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runIndex = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mams_access_token") || "" : "";
    const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
    if (!res.ok) {
      let detail = "Indexing failed";
      try {
        const err = await res.json();
        if (typeof err.detail === "string") detail = err.detail;
        else if (Array.isArray(err.detail)) detail = err.detail.map((e) => e.msg || "").join(" ");
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !meetingId) return;
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${baseUrl}/v1/meetings/${meetingId}/minutes`, {
        method: "POST",
        headers: authOnlyHeaders(),
        body: formData,
      });
      if (!res.ok) {
        let detail = "Upload failed";
        try {
          const err = await res.json();
          if (typeof err.detail === "string") detail = err.detail;
          else if (Array.isArray(err.detail)) detail = err.detail.map((x) => x.msg || "").join(" ");
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      await runIndex();
      onDone?.();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: embedded ? 2 : 2.5,
        borderRadius: 2,
        border: "1px solid #e8edf3",
        mb: embedded ? 1.5 : 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Description sx={{ fontSize: 22, color: "#004497" }} />
        Meeting minutes (AI context)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload PDF or Word (.docx) minutes. Text is indexed locally with Ollama embeddings so the chat assistant can answer
        questions about decisions and action items.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Button variant="contained" disabled={loading || !meetingId} onClick={() => inputRef.current?.click()}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Upload PDF or DOCX"}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Max size follows the agent service limit (see MEETING_AGENT_MAX_MINUTES_MB).
        </Typography>
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: "none" }}
        onChange={onFile}
      />
    </Paper>
  );
}
