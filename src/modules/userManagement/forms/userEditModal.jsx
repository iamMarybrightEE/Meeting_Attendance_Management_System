"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Divider,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  Close,
  Edit,
  PersonOff,
  PersonAdd,
  LockOpen,
  Lock,
  Delete,
} from "@mui/icons-material";
import { DEPARTMENTS, ACCOUNT_STATUS } from "../../../data/dummyData";
import { useAuth } from "../../../context/AuthContext";

const userEditSchema = Yup.object({
  firstName: Yup.string().min(2).required("First name is required"),
  middleName: Yup.string(),
  lastName: Yup.string().min(2).required("Last name is required"),
  username: Yup.string().min(3).required("Username is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  employeeId: Yup.string().required("Employee ID is required"),
  roleId: Yup.string().required("Role is required"),
  contact: Yup.string().required("Contact number is required"),
  department: Yup.string().required("Department is required"),
  department: Yup.string().required("Department is required"),
  job_title:  Yup.string(),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

function getStatusChip(status) {
  const map = {
    [ACCOUNT_STATUS.ACTIVE]:    { label: "Active",    bgcolor: "#e6f9ee", color: "#018e11" },
    [ACCOUNT_STATUS.INACTIVE]:  { label: "Inactive",  bgcolor: "#f5f5f5", color: "#6c757d" },
    [ACCOUNT_STATUS.SUSPENDED]: { label: "Suspended", bgcolor: "#fff3cd", color: "#856404" },
    [ACCOUNT_STATUS.LOCKED]:    { label: "Locked",    bgcolor: "#fde8e8", color: "#f74a4d" },
  };
  return map[status] || map[ACCOUNT_STATUS.INACTIVE];
}

export default function UserEditModal({ open, onClose, user, onSuccess }) {
  const { updateUser, changeUserStatus, deleteUser, roles } = useAuth();
  const [tabValue, setTabValue]       = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [apiError, setApiError]       = useState("");

  if (!user) return null;
  const statusStyle = getStatusChip(user.status);

  const handleStatusChange = async (newStatus) => {
    try {
      await changeUserStatus(user.id, newStatus);
      onSuccess?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      try {
        await deleteUser(user.id);
        onSuccess?.();
        onClose();
      } catch (err) {
        setApiError(err.message || "Failed to delete user.");
      }
    } else {
      setConfirmDelete(true);
    }
  };

 const handleSubmit = async (values, { setSubmitting }) => {
  setApiError("");
  try {
    await updateUser(user.id, values);
    onSuccess?.();
    onClose();
  } catch (err) {
    setApiError(err.message || "Failed to update user.");
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Dialog
      open={open}
      onClose={() => { onClose(); setConfirmDelete(false); setApiError(""); }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 60px rgba(0,0,0,0.15)", overflowY: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } } }}
    >
      {/* Header */}
      <Box sx={{ background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)", p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Edit sx={{ color: "#fff", fontSize: 20 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>Edit User</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>{user.firstName} {user.lastName}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip label={statusStyle.label} size="small" sx={{ bgcolor: statusStyle.bgcolor, color: statusStyle.color, fontWeight: 600, fontSize: "0.7rem" }} />
          <IconButton size="small" onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)" }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: "1px solid #e8edf3" }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            px: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.85rem" },
            "& .Mui-selected": { color: "#004497", fontWeight: 600 },
            "& .MuiTabs-indicator": { bgcolor: "#004497" },
          }}
        >
          <Tab label="Edit Profile" />
          <Tab label="Account Actions" />
        </Tabs>
      </Box>

      {apiError && (
        <Alert severity="error" sx={{ m: 2, borderRadius: 2 }} onClose={() => setApiError("")}>{apiError}</Alert>
      )}

      {/* Tab 1: Edit Profile */}
      {tabValue === 0 && (
        <Formik
          initialValues={{
            firstName: user.firstName || "",
            middleName: user.middleName || "",
            lastName: user.lastName || "",
            username: user.username || "",
            email: user.email || "",
            employeeId: user.employeeId || "",
            roleId: user.roleId || "",
            contact: user.contact || "",
            department: user.department || "",
            job_title:  user.job_title  || "",
          }}
          validationSchema={userEditSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form noValidate>
              <DialogContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <TextField
                      fullWidth name="firstName" label="First Name *"
                      value={values.firstName} onChange={handleChange} onBlur={handleBlur}
                      error={touched.firstName && Boolean(errors.firstName)}
                      helperText={touched.firstName && errors.firstName}
                      size="small" sx={inputStyle}
                    />
                    <TextField
                      fullWidth name="lastName" label="Last Name *"
                      value={values.lastName} onChange={handleChange} onBlur={handleBlur}
                      error={touched.lastName && Boolean(errors.lastName)}
                      helperText={touched.lastName && errors.lastName}
                      size="small" sx={inputStyle}
                    />
                  </Box>
                  <TextField
                    fullWidth name="middleName" label="Middle Name"
                    value={values.middleName} onChange={handleChange} onBlur={handleBlur}
                    size="small" sx={inputStyle}
                  />
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <TextField
                      fullWidth name="username" label="Username *"
                      value={values.username} onChange={handleChange} onBlur={handleBlur}
                      error={touched.username && Boolean(errors.username)}
                      helperText={touched.username && errors.username}
                      size="small" sx={inputStyle}
                    />
                    <TextField
                      fullWidth name="employeeId" label="Employee ID *"
                      value={values.employeeId} onChange={handleChange} onBlur={handleBlur}
                      error={touched.employeeId && Boolean(errors.employeeId)}
                      helperText={touched.employeeId && errors.employeeId}
                      size="small" sx={inputStyle}
                    />
                  </Box>
                  <TextField
                    fullWidth name="email" label="Email *" type="email"
                    value={values.email} onChange={handleChange} onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    size="small" sx={inputStyle}
                  />
                  <TextField
                    fullWidth name="contact" label="Contact Number *"
                    value={values.contact} onChange={handleChange} onBlur={handleBlur}
                    error={touched.contact && Boolean(errors.contact)}
                    helperText={touched.contact && errors.contact}
                    size="small" sx={inputStyle}
                  />
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <FormControl fullWidth size="small" error={touched.roleId && Boolean(errors.roleId)}>
                      <InputLabel sx={{ "&.Mui-focused": { color: "#004497" } }}>Role *</InputLabel>
                      <Select name="roleId" value={values.roleId} onChange={handleChange} onBlur={handleBlur} label="Role *" sx={{ borderRadius: 2 }}>
                        {roles.map((r) => (
                          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                      </Select>
                      {touched.roleId && errors.roleId && <FormHelperText>{errors.roleId}</FormHelperText>}
                    </FormControl>
                    <FormControl fullWidth size="small" error={touched.department && Boolean(errors.department)}>
                      <InputLabel sx={{ "&.Mui-focused": { color: "#004497" } }}>Department *</InputLabel>
                      <Select name="department" value={values.department} onChange={handleChange} onBlur={handleBlur} label="Department *" sx={{ borderRadius: 2 }}>
                        {DEPARTMENTS.map((d) => (
                          <MenuItem key={d} value={d}>{d}</MenuItem>
                        ))}
                      </Select>
                      {touched.department && errors.department && <FormHelperText>{errors.department}</FormHelperText>}
                    </FormControl>
                  </Box>
                  <TextField
                    fullWidth name="job_title" label="Job Title"
                    value={values.job_title} onChange={handleChange} onBlur={handleBlur}
                    placeholder="e.g. Senior Accountant"
                    size="small" sx={inputStyle}
                  />
                </Box>
              </DialogContent>
              <Divider />
              <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555" }}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}
                  sx={{ borderRadius: 2, background: "linear-gradient(135deg, #004497, #1c56a3)", textTransform: "none", fontWeight: 600 }}
                >
                  {isSubmitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Save Changes"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      )}

      {/* Tab 2: Account Actions */}
      {tabValue === 1 && (
        <>
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Manage account status and access for <strong>{user.firstName} {user.lastName}</strong>.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {user.status !== ACCOUNT_STATUS.ACTIVE && (
                  <Button startIcon={<PersonAdd />} onClick={() => handleStatusChange(ACCOUNT_STATUS.ACTIVE)} variant="outlined"
                    sx={{ borderRadius: 2, textTransform: "none", borderColor: "#018e11", color: "#018e11", "&:hover": { bgcolor: "#e6f9ee" }, justifyContent: "flex-start", px: 2, py: 1.2 }}
                  >
                    Activate Account
                  </Button>
                )}
                {user.status !== ACCOUNT_STATUS.INACTIVE && (
                  <Button startIcon={<PersonOff />} onClick={() => handleStatusChange(ACCOUNT_STATUS.INACTIVE)} variant="outlined"
                    sx={{ borderRadius: 2, textTransform: "none", borderColor: "#6c757d", color: "#6c757d", "&:hover": { bgcolor: "#f5f5f5" }, justifyContent: "flex-start", px: 2, py: 1.2 }}
                  >
                    Deactivate Account
                  </Button>
                )}
                {user.status !== ACCOUNT_STATUS.SUSPENDED && (
                  <Button startIcon={<Lock />} onClick={() => handleStatusChange(ACCOUNT_STATUS.SUSPENDED)} variant="outlined"
                    sx={{ borderRadius: 2, textTransform: "none", borderColor: "#FFB236", color: "#856404", "&:hover": { bgcolor: "#fff3cd" }, justifyContent: "flex-start", px: 2, py: 1.2 }}
                  >
                    Suspend Account
                  </Button>
                )}
                {user.status === ACCOUNT_STATUS.LOCKED && (
                  <Button startIcon={<LockOpen />} onClick={() => handleStatusChange(ACCOUNT_STATUS.ACTIVE)} variant="outlined"
                    sx={{ borderRadius: 2, textTransform: "none", borderColor: "#4f88c3", color: "#004497", "&:hover": { bgcolor: "#f0f4ff" }, justifyContent: "flex-start", px: 2, py: 1.2 }}
                  >
                    Unlock Account
                  </Button>
                )}

                <Divider sx={{ my: 1 }} />

                <Button startIcon={<Delete />} onClick={handleDelete} variant="outlined" color="error"
                  sx={{ borderRadius: 2, textTransform: "none", justifyContent: "flex-start", px: 2, py: 1.2 }}
                >
                  {confirmDelete ? "⚠ Click again to confirm permanent deletion" : "Delete Account Permanently"}
                </Button>

                {confirmDelete && (
                  <Typography variant="caption" color="error" sx={{ mt: -1 }}>
                    This action cannot be undone. All user data will be permanently removed.
                  </Typography>
                )}
              </Box>
            </Box>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => { onClose(); setConfirmDelete(false); }} variant="outlined" sx={{ borderRadius: 2, textTransform: "none" }}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
