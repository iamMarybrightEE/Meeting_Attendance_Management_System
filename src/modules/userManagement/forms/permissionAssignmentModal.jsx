"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormHelperText,
  Chip,
} from "@mui/material";
import { Close, Security } from "@mui/icons-material";
import { ROLES_DATA, PERMISSIONS } from "../../../data/dummyData";

const permissionSchema = Yup.object({
  roleId: Yup.string().required("Please select a role"),
  permissionIds: Yup.array().min(1, "Select at least one permission").required("Permissions are required"),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

// Group permissions by module
const groupedPermissions = PERMISSIONS.reduce((acc, perm) => {
  if (!acc[perm.module]) acc[perm.module] = [];
  acc[perm.module].push(perm);
  return acc;
}, {});

export default function PermissionAssignmentModal({ open, onClose }) {
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 60px rgba(0,0,0,0.15)", overflowY: "auto", scrollbarWidth: "none",
    "&::-webkit-scrollbar": { display: "none" },
    scrollBehavior: "smooth",} }}
    >
      <Box sx={{ background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)", p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Security sx={{ color: "#fff", fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700 }}>Assign Permissions to Role</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Formik
        initialValues={{ roleId: "", permissionIds: [] }}
        validationSchema={permissionSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
          <Form noValidate>
            <DialogContent sx={{ p: 3 }}>
              {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Permissions updated successfully!</Alert>}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormControl fullWidth size="small" error={touched.roleId && Boolean(errors.roleId)}>
                  <InputLabel sx={{ "&.Mui-focused": { color: "#004497" } }}>Select Role *</InputLabel>
                  <Select
                    name="roleId"
                    value={values.roleId}
                    onChange={(e) => {
                      handleChange(e);
                      // Auto-select current role permissions
                      const role = ROLES_DATA.find(r => r.id === e.target.value);
                      if (role) setFieldValue("permissionIds", role.permissionIds);
                    }}
                    onBlur={handleBlur}
                    label="Select Role *"
                    sx={{ borderRadius: 2 }}
                  >
                    {ROLES_DATA.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: r.color }} />
                          {r.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.roleId && errors.roleId && <FormHelperText>{errors.roleId}</FormHelperText>}
                </FormControl>

                {/* Permission Groups */}
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <Box key={module}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#004497", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", mb: 1 }}>
                      {module}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {perms.map((perm) => {
                        const isSelected = values.permissionIds.includes(perm.id);
                        return (
                          <Chip
                            key={perm.id}
                            label={perm.name}
                            size="small"
                            onClick={() => {
                              if (isSelected) {
                                setFieldValue("permissionIds", values.permissionIds.filter(id => id !== perm.id));
                              } else {
                                setFieldValue("permissionIds", [...values.permissionIds, perm.id]);
                              }
                            }}
                            sx={{
                              cursor: "pointer",
                              borderRadius: "6px",
                              fontWeight: isSelected ? 600 : 400,
                              bgcolor: isSelected ? "#004497" : "#f0f4ff",
                              color: isSelected ? "#fff" : "#004497",
                              border: `1px solid ${isSelected ? "#004497" : "#dae3f4"}`,
                              fontSize: "0.72rem",
                              transition: "all 0.15s",
                              "&:hover": { bgcolor: isSelected ? "#003380" : "#dae3f4" },
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                ))}

                {touched.permissionIds && errors.permissionIds && (
                  <Typography variant="caption" color="error">{errors.permissionIds}</Typography>
                )}

                <Box sx={{ p: 1.5, bgcolor: "#f0f4ff", borderRadius: 2 }}>
                  <Typography variant="caption" color="#004497">
                    <strong>{values.permissionIds.length}</strong> permissions selected
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555" }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ borderRadius: 2, background: "linear-gradient(135deg, #004497, #1c56a3)", textTransform: "none", fontWeight: 600 }}>
                {isSubmitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Save Permissions"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
