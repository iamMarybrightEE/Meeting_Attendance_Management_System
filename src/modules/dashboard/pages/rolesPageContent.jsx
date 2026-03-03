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
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  AdminPanelSettings,
  Security,
  Check,
  Close,
  People,
  Add,
  EmojiEvents,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { PERMISSIONS as CANONICAL_PERMISSIONS } from "../../../data/dummyData";
import PermissionAssignmentModal from "../../userManagement/forms/permissionAssignmentModal";
import CreateRoleModal from "../../userManagement/forms/createRoleModal";

// Canonical permission order for sorting the matrix
const PERM_ORDER = {};
CANONICAL_PERMISSIONS.forEach((p, i) => { PERM_ORDER[p.name] = i; });

// Canonical module order
const MODULE_ORDER = ['User Management', 'Meeting Management', 'Attendance', 'Reports', 'System'];

// Level badge styles per level number
function getLevelStyle(level) {
  const styles = {
    1: { bg: "#fff0f0", color: "#c0392b", label: "Level 1", border: "#fecaca" },
    2: { bg: "#fff8e1", color: "#b7791f", label: "Level 2", border: "#fde68a" },
    3: { bg: "#e8f4f8", color: "#2980b9", label: "Level 3", border: "#bfdbfe" },
    4: { bg: "#f0fff4", color: "#27ae60", label: "Level 4", border: "#bbf7d0" },
  };
  return styles[level] || { bg: "#f3f4f6", color: "#6b7280", label: `Level ${level}`, border: "#e5e7eb" };
}

function getRoleAccentColor(level) {
  const colors = {
    1: "#004497",
    2: "#1c56a3",
    3: "#0b6cc2",
    4: "#4b4c4d",
  };
  return colors[level] || "#6b7280";
}

export default function RolesPageContent() {
  const { roles, fetchRoles } = useAuth();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen]   = useState(false);
  const [snackbar, setSnackbar]               = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    if (roles.length === 0) {
      setLoading(true);
      fetchRoles().finally(() => setLoading(false));
    }
  }, []);

  // Build all unique permissions across all roles
  const rawPermissions = [];
  const permSet = new Set();
  roles.forEach((role) => {
    (role.permissions || []).forEach((p) => {
      if (!permSet.has(p.id)) {
        permSet.add(p.id);
        rawPermissions.push(p);
      }
    });
  });

  // Sort by canonical PERMISSIONS order (action name as key)
  const allPermissions = [...rawPermissions].sort((a, b) => {
    const orderA = PERM_ORDER[a.action] ?? 9999;
    const orderB = PERM_ORDER[b.action] ?? 9999;
    return orderA - orderB;
  });

  // Sort modules in canonical order
  const modules = MODULE_ORDER.filter((mod) =>
    allPermissions.some((p) => p.module === mod)
  );

  return (
    <Box sx={{ animation: "fadeIn 0.4s ease", "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Roles & Permissions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage system roles, authority levels and permission assignments
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            startIcon={<Security />}
            variant="outlined"
            onClick={() => setAssignModalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#004497",
              color: "#004497",
              "&:hover": { bgcolor: "#e8f0fe" },
            }}
          >
            Assign Permissions
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setCreateRoleOpen(true)}
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
            Add New Role
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: "#004497" }} />
        </Box>
      ) : (
        <>
          {/* Role Cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2.5, mb: 3 }}>
            {roles.map((role, i) => {
              const levelStyle = getLevelStyle(role.level);
              const accentColor = getRoleAccentColor(role.level);
              return (
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
                  {/* Top accent bar */}
                  {/* <Box sx={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} /> */}

                  <Box sx={{ p: 2.5 }}>
                    {/* Header row: name + level badge */}
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "10px",
                            bgcolor: `${accentColor}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {role.level === 1
                            ? <EmojiEvents sx={{ color: accentColor, fontSize: 18 }} />
                            : <AdminPanelSettings sx={{ color: accentColor, fontSize: 18 }} />
                          }
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: "#1a1a2e", fontSize: "0.95rem", lineHeight: 1.2 }}>
                          {role.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={levelStyle.label}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          bgcolor: levelStyle.bg,
                          color: levelStyle.color,
                          border: `1px solid ${levelStyle.border}`,
                          borderRadius: "6px",
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6b7280",
                        fontSize: "0.78rem",
                        lineHeight: 1.5,
                        mb: 2,
                        minHeight: 48,
                      }}
                    >
                      {role.description || "No description provided."}
                    </Typography>

                    <Divider sx={{ mb: 1.5 }} />

                    {/* Stats row */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <People sx={{ fontSize: 15, color: "#9ca3af" }} />
                        <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500, fontSize: "0.75rem" }}>
                          {role.userCount} {role.userCount === 1 ? "user" : "users"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          bgcolor: `${accentColor}10`,
                          px: 1.2,
                          py: 0.4,
                          borderRadius: "6px",
                        }}
                      >
                        <Security sx={{ fontSize: 13, color: accentColor }} />
                        <Typography variant="caption" sx={{ color: accentColor, fontWeight: 700, fontSize: "0.73rem" }}>
                          {role.permissionIds.length} {role.permissionIds.length === 1 ? "perm" : "perms"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>

          {/* Permission Matrix */}
          {allPermissions.length > 0 && (
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
                      {roles.map((r) => (
                        <TableCell key={r.id} align="center" sx={{ fontWeight: 700, color: getRoleAccentColor(r.level), fontSize: "0.78rem", py: 1.5, whiteSpace: "nowrap" }}>
                          {r.name}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const rows = [];
                      let lastModule = null;
                      allPermissions.forEach((perm, i) => {
                        // Insert a module group header row when the module changes
                        if (perm.module !== lastModule) {
                          lastModule = perm.module;
                          rows.push(
                            <TableRow key={`module-${perm.module}`} sx={{ bgcolor: "#f0f4ff" }}>
                              <TableCell
                                colSpan={roles.length + 1}
                                sx={{ py: 1, px: 2, borderTop: i > 0 ? "2px solid #e8edf3" : "none" }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.72rem",
                                    color: "#004497",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                  }}
                                >
                                  {perm.module}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        rows.push(
                          <TableRow key={perm.id} sx={{ "&:hover": { bgcolor: "#f8faff" }, bgcolor: "#fff" }}>
                            <TableCell sx={{ py: 1.2, pl: 3 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem", color: "#374151" }}>
                                {perm.action}
                              </Typography>
                              {perm.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                                  {perm.description}
                                </Typography>
                              )}
                            </TableCell>
                            {roles.map((r) => {
                              const has = r.permissionIds.includes(perm.id);
                              return (
                                <TableCell key={r.id} align="center" sx={{ py: 1.2 }}>
                                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                                    {has ? (
                                      <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "#e6f9ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Check sx={{ fontSize: 14, color: "#018e11" }} />
                                      </Box>
                                    ) : (
                                      <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Close sx={{ fontSize: 14, color: "#d1d5db" }} />
                                      </Box>
                                    )}
                                  </Box>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      });
                      return rows;
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      <PermissionAssignmentModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={() => {
          setSnackbar({ open: true, message: "Permissions updated successfully!", severity: "success" });
          fetchRoles();
        }}
      />

      <CreateRoleModal
        open={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        onSuccess={() => {
          setSnackbar({ open: true, message: "Role created successfully!", severity: "success" });
          fetchRoles();
        }}
      />

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
