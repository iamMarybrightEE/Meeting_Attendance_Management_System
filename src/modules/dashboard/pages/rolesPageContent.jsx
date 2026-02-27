"use client";

import { useState } from "react";
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
  Avatar,
  Divider,
  Tooltip,
  IconButton,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  AdminPanelSettings,
  Edit,
  Security,
  Check,
  Close,
  People,
} from "@mui/icons-material";
import { ROLES_DATA, PERMISSIONS, PERMISSION_MATRIX } from "../../../data/dummyData";
import PermissionAssignmentModal from "../../userManagement/forms/permissionAssignmentModal";

export default function RolesPageContent() {
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  // Group permissions by module for display
  const modules = [...new Set(PERMISSIONS.map((p) => p.module))];

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Roles & Permissions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage system roles and permission assignments
          </Typography>
        </Box>
        <Button
          startIcon={<Security />}
          variant="contained"
          onClick={() => setAssignModalOpen(true)}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
            boxShadow: "0 4px 12px rgba(0,68,151,0.3)",
            "&:hover": { background: "linear-gradient(135deg, #003380, #1549a0)", transform: "translateY(-1px)" },
            transition: "all 0.2s",
          }}
        >
          Assign Permissions
        </Button>
      </Box>

      {/* Role Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2, mb: 3 }}>
        {ROLES_DATA.map((role, i) => (
          <Paper
            key={role.id}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${role.color}22`,
              background: `linear-gradient(135deg, ${role.color}08, ${role.color}04)`,
              transition: "all 0.25s",
              "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
              animation: `slideIn 0.3s ease ${i * 0.08}s both`,
              "@keyframes slideIn": { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: `${role.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AdminPanelSettings sx={{ color: role.color, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: "0.85rem" }}>{role.name}</Typography>
                <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.7rem" }}>Level {role.level}</Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, lineHeight: 1.4, fontSize: "0.75rem" }}>
              {role.description}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <People sx={{ fontSize: 14, color: "#6b7280" }} />
                <Typography variant="caption" color="text.secondary">{role.userCount} users</Typography>
              </Box>
              <Chip
                label={`${role.permissionIds.length} perms`}
                size="small"
                sx={{ height: 18, fontSize: "0.65rem", bgcolor: `${role.color}15`, color: role.color, fontWeight: 600, borderRadius: "5px" }}
              />
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Permission Matrix */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8edf3", overflow: "hidden" }}>
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e8edf3" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Permission Matrix</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mt: 0.3 }}>
            Access rights per role across all system modules
          </Typography>
        </Box>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", py: 1.5, minWidth: 200 }}>
                  Permission / Action
                </TableCell>
                {ROLES_DATA.map((r) => (
                  <TableCell key={r.id} align="center" sx={{ fontWeight: 700, color: r.color, fontSize: "0.78rem", py: 1.5, whiteSpace: "nowrap" }}>
                    {r.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(PERMISSION_MATRIX["System Administrator"]).map((perm, i) => {
                const permInfo = PERMISSIONS.find((p) => p.name === perm);
                return (
                  <TableRow
                    key={perm}
                    sx={{
                      "&:hover": { bgcolor: "#f8faff" },
                      bgcolor: i % 2 === 0 ? "#fff" : "#fafbfc",
                    }}
                  >
                    <TableCell sx={{ py: 1.2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem", color: "#374151" }}>
                        {perm}
                      </Typography>
                      {permInfo && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                          {permInfo.description}
                        </Typography>
                      )}
                    </TableCell>
                    {ROLES_DATA.map((r) => {
                      const hasPermission = PERMISSION_MATRIX[r.name]?.[perm];
                      return (
                        <TableCell key={r.id} align="center" sx={{ py: 1.2 }}>
                          <Box sx={{ display: "flex", justifyContent: "center" }}>
                            {hasPermission ? (
                              <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "#e6f9ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Check sx={{ fontSize: 14, color: "#018e11", fontWeight: 700 }} />
                              </Box>
                            ) : (
                              <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "#fde8e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Close sx={{ fontSize: 14, color: "#f74a4d" }} />
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <PermissionAssignmentModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
      />

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ open: false, message: "" })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
