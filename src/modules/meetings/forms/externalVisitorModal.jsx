"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Close, PersonAdd } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";

const visitorSchema = Yup.object({
  firstName: Yup.string().min(2, "Too short").required("First name is required"),
  lastName: Yup.string().min(2, "Too short").required("Last name is required"),
  middleName: Yup.string(),
  organization: Yup.string().min(2, "Too short").required("Organization is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Invalid phone number")
    .required("Phone is required"),
  registrationLink: Yup.string(),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function ExternalVisitorModal({ open, meeting, onClose, onSuccess }) {
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setApiError("");
    try {
      const fullName = [values.firstName, values.middleName, values.lastName]
        .filter(Boolean)
        .join(" ");

      const response = await fetch(`/api/meetings/${meeting?.id}/external-participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          organization: values.organization,
          email: values.email,
          phone: values.phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register visitor');
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to register visitor. Please try again.");
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
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" }
        } 
      }}
    >
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
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
          >
            Register External Visitor
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "rgba(255,255,255,0.8)" }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Formik
        initialValues={{
          firstName: "",
          middleName: "",
          lastName: "",
          organization: "",
          email: "",
          phone: "",
          registrationLink: meeting?.externalLink || "",
        }}
        validationSchema={visitorSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form noValidate>
            <DialogContent sx={{ p: 3 }}>
              {apiError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {apiError}
                </Alert>
              )}
              {meeting && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Meeting: {meeting.title}
                </Typography>
              )}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    name="firstName"
                    label="First Name *"
                    value={values.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.firstName && Boolean(errors.firstName)}
                    helperText={touched.firstName && errors.firstName}
                    sx={inputStyle}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    name="middleName"
                    label="Middle Name"
                    value={values.middleName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    sx={inputStyle}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    name="lastName"
                    label="Last Name *"
                    value={values.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.lastName && Boolean(errors.lastName)}
                    helperText={touched.lastName && errors.lastName}
                    sx={inputStyle}
                  />
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  name="organization"
                  label="Organization *"
                  placeholder="e.g., ABC Corporation"
                  value={values.organization}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.organization && Boolean(errors.organization)}
                  helperText={touched.organization && errors.organization}
                  sx={inputStyle}
                />

                <TextField
                  fullWidth
                  size="small"
                  name="email"
                  label="Email *"
                  type="email"
                  placeholder="visitor@company.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  sx={inputStyle}
                />

                <TextField
                  fullWidth
                  size="small"
                  name="phone"
                  label="Phone *"
                  placeholder="+1-555-0123"
                  value={values.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.phone && Boolean(errors.phone)}
                  helperText={touched.phone && errors.phone}
                  sx={inputStyle}
                />

                <TextField
                  fullWidth
                  size="small"
                  name="registrationLink"
                  label="Registration Link"
                  placeholder="https://meet.example.com/..."
                  value={values.registrationLink}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  sx={inputStyle}
                />
              </Box>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button
                onClick={onClose}
                variant="outlined"
                disabled={isSubmitting}
                sx={{
                  borderRadius: 2,
                  borderColor: "#d0d5dd",
                  color: "#555",
                  textTransform: "none",
                  "&:hover": { borderColor: "#004497", color: "#004497" },
                }}
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
                  display: "flex",
                  gap: 1,
                  "&:hover": {
                    background: "linear-gradient(135deg, #003380 0%, #1549a0 100%)",
                  },
                }}
              >
                {isSubmitting && <CircularProgress size={20} sx={{ color: "#fff" }} />}
                Register Visitor
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
 