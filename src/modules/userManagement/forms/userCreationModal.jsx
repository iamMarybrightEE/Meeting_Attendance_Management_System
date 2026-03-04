"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Divider,
} from "@mui/material";
import { Close, PersonAdd, Visibility, VisibilityOff } from "@mui/icons-material";
import { DEPARTMENTS } from "../../../data/dummyData";
import { useAuth } from "../../../context/AuthContext";

const userCreationSchema = Yup.object({
  firstName:  Yup.string().min(2, "Too short").required("First name is required"),
  lastName:   Yup.string().min(2, "Too short").required("Last name is required"),
  middleName: Yup.string(),
  username:   Yup.string(),
  employeeId: Yup.string().min(3, "Too short").required("Employee ID is required"),
  email:      Yup.string().email("Invalid email").required("Email is required"),
  password:   Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .matches(/[0-9]/, "Must contain at least one number")
    .required("Password is required"),
  roleId:     Yup.string().required("Role is required"),
  contact:    Yup.string()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Invalid phone number")
    .required("Contact number is required"),
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

export default function UserCreationModal({ open, onClose, onSuccess }) {
  const { createUser, roles } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError]         = useState("");

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setApiError("");
    try {
      await createUser(values);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to create user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          overflowY: "auto", scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PersonAdd sx={{ color: "#fff", fontSize: 22 }} />
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
            Create New User
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Formik
        initialValues={{
          firstName: "", middleName: "", lastName: "", username: "", employeeId: "",
          email: "", password: "", roleId: "", contact: "", department: "", job_title: "",
        }}
        validationSchema={userCreationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form noValidate>
            <DialogContent sx={{ p: 3 }}>
              {apiError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{apiError}</Alert>}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* Name Row */}
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
                  fullWidth name="username" label="username " type="username"
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
                  fullWidth name="email" label="Email Address *" type="email"
                  value={values.email} onChange={handleChange} onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  size="small" sx={inputStyle}
                />

                <TextField
                  fullWidth name="password" label="Password *"
                  type={showPassword ? "text" : "password"}
                  value={values.password} onChange={handleChange} onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyle}
                />

                <TextField
                  fullWidth name="contact" label="Contact Number *"
                  value={values.contact} onChange={handleChange} onBlur={handleBlur}
                  error={touched.contact && Boolean(errors.contact)}
                  helperText={touched.contact && errors.contact}
                  placeholder="+256 700 000 000"
                  size="small" sx={inputStyle}
                />

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <FormControl fullWidth size="small" error={touched.roleId && Boolean(errors.roleId)}>
                    <InputLabel sx={{ "&.Mui-focused": { color: "#004497" } }}>Role *</InputLabel>
                    <Select
                      name="roleId" value={values.roleId}
                      onChange={handleChange} onBlur={handleBlur}
                      label="Role *" sx={{ borderRadius: 2 }}
                    >
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                      ))}
                    </Select>
                    {touched.roleId && errors.roleId && <FormHelperText>{errors.roleId}</FormHelperText>}
                  </FormControl>

                  <FormControl fullWidth size="small" error={touched.department && Boolean(errors.department)}>
                    <InputLabel sx={{ "&.Mui-focused": { color: "#004497" } }}>Department *</InputLabel>
                    <Select
                      name="department" value={values.department}
                      onChange={handleChange} onBlur={handleBlur}
                      label="Department *" sx={{ borderRadius: 2 }}
                    >
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
              <Button
                onClick={onClose}
                variant="outlined"
                sx={{ borderRadius: 2, borderColor: "#d0d5dd", color: "#555", textTransform: "none", "&:hover": { borderColor: "#004497", color: "#004497" } }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                  "&:hover": { background: "linear-gradient(135deg, #003380 0%, #1549a0 100%)" },
                }}
              >
                {isSubmitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Create User"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
