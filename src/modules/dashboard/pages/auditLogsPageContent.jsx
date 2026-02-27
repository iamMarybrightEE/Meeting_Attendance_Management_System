"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Search,
  FilterList,
  Visibility,
  GetApp,
  Refresh,
} from "@mui/icons-material";
import { AUDIT_LOGS } from "../../../data/dummyData";

const ROWS_PER_PAGE = 12;

function getActionColor(action) {
  const map = {
    LOGIN: "#018e11",
    FAILED_LOGIN: "#f74a4d",
    CREATE_USER: "#004497",
    SUSPEND_USER: "#FFB236",
    LOCK_ACCOUNT: "#f74a4d",
    ROLE_CHANGE: "#8557D3",
    PASSWORD_RESET: "#0073ff",
    DEACTIVATE_USER: "#ff5062",
    PROFILE_UPDATE: "#6c757d",
  };
  return map[action] || "#6c757d";
}

export default function AuditLogsPageContent() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const modules = ["All", ...new Set(AUDIT_LOGS.map((l) => l.module))];

  const filtered = AUDIT_LOGS.filter((log) => {
    const matchSearch =
      !search ||
      log.userName?.toLowerCase().includes(search.toLowerCase()) ||
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === "All" || log.module === moduleFilter;
    const matchStatus = statusFilter === "All" || log.status === statusFilter;
    return matchSearch && matchModule && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Audit Logs</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Complete system activity trail and security audit records
          </Typography>
        </Box>
        <Button
          startIcon={<GetApp />}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555", "&:hover": { borderColor: "#004497", color: "#004497" } }}
        >
          Export Logs
        </Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        {/* Filters */}
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3", display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9ca3af", fontSize: 20 }} /></InputAdornment>,
            }}
            sx={{ flex: 1, minWidth: 220, maxWidth: 300, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f9fafb" } }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Module</InputLabel>
            <Select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }} label="Module" sx={{ borderRadius: 2, bgcolor: "#f9fafb" }}>
              {modules.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} label="Status" sx={{ borderRadius: 2, bgcolor: "#f9fafb" }}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["Timestamp", "User", "Action", "Module", "Description", "IP Address", "Status"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.5, whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">No logs found</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.map((log, i) => (
                <TableRow
                  key={log.id}
                  sx={{
                    "&:hover": { bgcolor: "#f8faff" },
                    animation: `fadeIn 0.25s ease ${i * 0.03}s both`,
                  }}
                >
                  <TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>
                    <Typography variant="caption" sx={{ color: "#555", fontSize: "0.75rem" }}>
                      {new Date(log.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>{log.userName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>{log.userEmail}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.action.replace(/_/g, " ")}
                      size="small"
                      sx={{ height: 20, fontSize: "0.68rem", bgcolor: `${getActionColor(log.action)}15`, color: getActionColor(log.action), fontWeight: 600, borderRadius: "5px" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem" }}>{log.module}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#555", bgcolor: "#f3f4f6", px: 1, py: 0.3, borderRadius: 1, fontSize: "0.72rem" }}>
                      {log.ipAddress}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        borderRadius: "5px",
                        bgcolor: log.status === "success" ? "#e6f9ee" : "#fde8e8",
                        color: log.status === "success" ? "#018e11" : "#f74a4d",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="caption" color="text.secondary">
              Showing {Math.min((page - 1) * ROWS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length} logs
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small"
              sx={{ "& .MuiPaginationItem-root": { borderRadius: 1.5 }, "& .Mui-selected": { bgcolor: "#004497", color: "#fff" } }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
