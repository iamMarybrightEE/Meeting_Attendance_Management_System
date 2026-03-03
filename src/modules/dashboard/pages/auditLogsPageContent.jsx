"use client";

import { useState, useEffect } from "react";
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
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { Search, GetApp,  PictureAsPdf,  TableChart,  ExpandMore, } from "@mui/icons-material";
import { auditLogsApi } from "../../../lib/apiClient";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from "@mui/material";
  

const ROWS_PER_PAGE = 12;

function getActionColor(action) {
  const map = {
    // Auth actions
    AUTH_LOGIN:            "#018e11",
    AUTH_LOGOUT:           "#6c757d",
    AUTH_FAILED:           "#f74a4d",
    AUTH_LOGIN_FAILED:     "#f74a4d",
    // User actions
    USER_CREATE:           "#004497",
    USER_UPDATE:           "#6c757d",
    USER_DELETE:           "#ff5062",
    USER_STATUS_ACTIVE:    "#018e11",
    USER_STATUS_INACTIVE:  "#6c757d",
    USER_STATUS_SUSPENDED: "#FFB236",
    USER_STATUS_LOCKED:    "#f74a4d",
    // Role / Permission actions
    ROLE_CREATE:           "#8557D3",
    ROLE_UPDATE:           "#8557D3",
    ROLE_DELETE:           "#ff5062",
    USER_PERMISSIONS_UPDATE: "#8557D3",
    // Password actions
    PASSWORD_CHANGE:       "#0073ff",
    PASSWORD_RESET:        "#0073ff",
  };
  return map[action] || "#6c757d";
}

function getStatusStyle(status) {
  if (status === "failed") {
    return { label: "Failed", bgcolor: "#fde8e8", color: "#f74a4d" };
  }
  return { label: "Success", bgcolor: "#e6f9ee", color: "#018e11" };
}


export default function AuditLogsPageContent() {
  const [logs, setLogs]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [page, setPage]               = useState(1);
  const [exportAnchor, setExportAnchor] = useState(null);

  const modules = ["All", ...new Set(logs.map((l) => l.module).filter(Boolean))];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {
          limit:  ROWS_PER_PAGE,
          offset: (page - 1) * ROWS_PER_PAGE,
        };
        if (moduleFilter !== "All") params.module = moduleFilter;
        if (search) params.action = search;
        const result = await auditLogsApi.list(params);
        setLogs(result.logs || []);
        setTotal(result.total || 0);
      } catch (err) {
        console.error("Failed to load audit logs:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, moduleFilter, search]);

  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  // Client-side search filter on loaded data
  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q)
    );
  });
    const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Module", "Description", "IP Address", "Status"];
    const rows = filtered.map((u) => [
      u.timestamp || "",
      u.userName || "",
      u.action  || "",
      u.module     || "",
      u.description || "",
      u.ipAddress      || "",
      u.status    || "",
    ]);
    const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportAnchor(null);
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    const tableRows = filtered.map((u) => `
      <tr>
        <td>${u.timestamp || "—"}</td>
        <td>${u.userName || "—"}</td>
        <td>${u.action || "—"}</td>
        <td>${u.module || "—"}</td>
        <td>${u.description || "—"}</td>
        <td>${u.ipAddress || "—"}</td>
        <td>${u.status || "—"}</td>
      </tr>
    `).join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Logs Export</title>
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
        <h2>URA MAMS — Audit Logs</h2>
        <p>Exported on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} &nbsp;|&nbsp; ${filtered.length} logs</p>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Description</th>
              <th>IP Address</th>
              <th>Status</th>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={28} sx={{ color: "#004497" }} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">No logs found</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.map((log, i) => {
                const statusStyle = getStatusStyle(log.status);
                return (
                  <TableRow
                    key={log.id || i}
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
                    <TableCell sx={{ maxWidth: 260 }}>
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
                        label={statusStyle.label}
                        size="small"
                        sx={{ height: 20, fontSize: "0.68rem", bgcolor: statusStyle.bgcolor, color: statusStyle.color, fontWeight: 700, borderRadius: "5px" }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e8edf3" }}>
            <Typography variant="caption" color="text.secondary">
              Showing page {page} of {totalPages} ({total} total logs)
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
