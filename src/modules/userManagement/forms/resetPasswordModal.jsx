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
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Close, Visibility, VisibilityOff, LockReset } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";

const resetPasswordSchema = Yup.object({
  currentPassword: Yup.string()
    .min(8, "Must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .matches(/[0-9]/, "Must contain at least one number")
    .required("Current password is required"),
  newPassword: Yup.string()
    .min(8, "Must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .matches(/[0-9]/, "Must contain at least one number")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords do not match")
    .required("Please confirm the password"),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function ResetPasswordModal({ open, onClose, user }) {
  const { resetPassword } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setApiError("");
    try {
      await resetPassword(user.id,values.currentPassword, values.newPassword);
      setSuccess(true);
      resetForm();
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (err) {
      setApiError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 60px rgba(0,0,0,0.15)", overflowY: "auto", scrollbarWidth: "none",
    "&::-webkit-scrollbar": { display: "none" },
    scrollBehavior: "smooth",} }}
    >
      <Box sx={{ background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)", p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <LockReset sx={{ color: "#fff", fontSize: 20 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>Reset Password</Typography>
            {user && <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>for {user.firstName} {user.lastName}</Typography>}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Formik initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }} validationSchema={resetPasswordSchema} onSubmit={handleSubmit}>
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form noValidate>
            <DialogContent sx={{ p: 3 }}>
              {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Password reset successfully!</Alert>}
              {apiError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setApiError("")}>{apiError}</Alert>}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Set a new password for this user account. They will be notified via email.
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth name="currentPassword" label="Current Password *"
                  type={showCurrent ? "text" : "password"}
                  value={values.currentPassword} onChange={handleChange} onBlur={handleBlur}
                  error={touched.currentPassword && Boolean(errors.currentPassword)}
                  helperText={touched.currentPassword && errors.currentPassword}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCurrent(!showCurrent)}>
                          {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyle}
                />
                <TextField
                  fullWidth name="newPassword" label="New Password *"
                  type={showNew ? "text" : "password"}
                  value={values.newPassword} onChange={handleChange} onBlur={handleBlur}
                  error={touched.newPassword && Boolean(errors.newPassword)}
                  helperText={touched.newPassword && errors.newPassword}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNew(!showNew)}>
                          {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyle}
                />
                <TextField
                  fullWidth name="confirmPassword" label="Confirm Password *"
                  type={showConfirm ? "text" : "password"}
                  value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowConfirm(!showConfirm)}>
                          {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyle}
                />
              </Box>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", borderColor: "#d0d5dd", color: "#555" }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ borderRadius: 2, background: "linear-gradient(135deg, #004497, #1c56a3)", textTransform: "none", fontWeight: 600 }}>
                {isSubmitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Reset Password"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
