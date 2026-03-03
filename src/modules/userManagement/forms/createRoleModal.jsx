"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Close, ExpandMore, AdminPanelSettings } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { rolesApi } from "../../../lib/apiClient";

export default function CreateRoleModal({ open, onClose, onSuccess }) {
  const { roles, fetchRoles } = useAuth();
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // Build a deduplicated list of all permissions from existing roles
  const allPermissions = [];
  const permSet = new Set();
  roles.forEach((role) => {
    (role.permissions || []).forEach((p) => {
      if (!permSet.has(p.id)) {
        permSet.add(p.id);
        allPermissions.push(p);
      }
    });
  });

  // Group by module
  const modules = [...new Set(allPermissions.map((p) => p.module).filter(Boolean))];
  const permsByModule = {};
  allPermissions.forEach((p) => {
    const mod = p.module || "Other";
    if (!permsByModule[mod]) permsByModule[mod] = [];
    permsByModule[mod].push(p);
  });

  const handleReset = () => {
    setName("");
    setDescription("");
    setSelectedPermIds([]);
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const togglePerm = (id) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleModule = (mod) => {
    const modPerms = (permsByModule[mod] || []).map((p) => p.id);
    const allSelected = modPerms.every((id) => selectedPermIds.includes(id));
    if (allSelected) {
      setSelectedPermIds((prev) => prev.filter((id) => !modPerms.includes(id)));
    } else {
      setSelectedPermIds((prev) => [...new Set([...prev, ...modPerms])]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 1. Create the role
      const res = await rolesApi.create({ name: name.trim(), description: description.trim() });
      const newRoleId = res.role?.id;

      // 2. If permissions selected, assign them via PATCH
      if (newRoleId && selectedPermIds.length > 0) {
        await rolesApi.update(newRoleId, { permission_ids: selectedPermIds });
      }

      await fetchRoles();
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          px: 3,
          pt: 3,
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              bgcolor: "#e8f0fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AdminPanelSettings sx={{ color: "#004497", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
              Create New Role
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Define a new role and assign permissions
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: "#9ca3af" }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Role Name */}
        <TextField
          label="Role Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          placeholder="e.g. Moderator"
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        {/* Description */}
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
          size="small"
          placeholder="Describe what this role can do..."
          sx={{ mb: 2.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        {/* Permissions */}
        {allPermissions.length > 0 && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
                Assign Permissions
              </Typography>
              <Chip
                label={`${selectedPermIds.length} selected`}
                size="small"
                sx={{ bgcolor: "#e8f0fe", color: "#004497", fontWeight: 600, fontSize: "0.72rem" }}
              />
            </Box>
            {Object.entries(permsByModule).map(([mod, perms]) => {
              const modPermIds = perms.map((p) => p.id);
              const allSelected = modPermIds.every((id) => selectedPermIds.includes(id));
              const someSelected = modPermIds.some((id) => selectedPermIds.includes(id));
              return (
                <Accordion
                  key={mod}
                  disableGutters
                  elevation={0}
                  sx={{
                    mb: 1,
                    border: "1px solid #e8edf3",
                    borderRadius: "8px !important",
                    "&:before": { display: "none" },
                    overflow: "hidden",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ fontSize: 18 }} />}
                    sx={{ minHeight: 44, py: 0, px: 1.5, bgcolor: allSelected ? "#e8f0fe" : "transparent" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={() => toggleModule(mod)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ p: 0.5, color: "#004497", "&.Mui-checked": { color: "#004497" } }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem", color: "#1a1a2e" }}>
                        {mod}
                      </Typography>
                      <Chip
                        label={`${modPermIds.filter((id) => selectedPermIds.includes(id)).length}/${perms.length}`}
                        size="small"
                        sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#f3f4f6", ml: "auto", mr: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2, pt: 0.5, pb: 1.5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
                      {perms.map((p) => (
                        <FormControlLabel
                          key={p.id}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedPermIds.includes(p.id)}
                              onChange={() => togglePerm(p.id)}
                              sx={{ p: 0.5, color: "#004497", "&.Mui-checked": { color: "#004497" } }}
                            />
                          }
                          label={
                            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#374151" }}>
                              {p.action}
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
            "&:hover": { background: "linear-gradient(135deg, #003380, #1549a0)" },
          }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Create Role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
