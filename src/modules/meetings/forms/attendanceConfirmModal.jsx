"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Close, QrCode } from "@mui/icons-material";
import { ATTENDANCE_STATUS } from "../../../data/dummyData";

const attendanceSchema = Yup.object({
  meeting_id: Yup.string().required("Meeting ID is required"),
  user_id: Yup.string().required("User ID is required"),
  qr_code: Yup.string().required("QR Code is required to confirm attendance"),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function AttendanceConfirmModal({ open, attendance, meeting, onClose, onSuccess }) {
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (values, { setSubmitting }) => {
    setApiError("");
    try {
      console.log("Updating attendance:", {
        meetingId: meeting?.id,
        userId: attendance?.userId,
        ...values
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to confirm attendance. Please try again.");
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
          <QrCode sx={{ color: "#fff", fontSize: 22 }} />
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
          >
            Confirm Attendance
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
          meeting_id: meeting?.id || "",
          user_id: attendance?.userId || "",
          qr_code: "",
        }}
        validationSchema={attendanceSchema}
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

              {/* Meeting & Employee Info */}
              {meeting && attendance && (
              <Box sx={{ bgcolor: "#f8f9fa", p: 2, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {meeting?.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {meeting?.date} • {meeting?.startTime} - {meeting?.endTime}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Employee:</strong> {attendance?.userName}
                </Typography>
              </Box>
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* QR Code Input */}
                <TextField
                  fullWidth
                  size="small"
                  name="qr_code"
                  label="QR Code *"
                  placeholder="Scan or enter QR code..."
                  value={values.qr_code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.qr_code && Boolean(errors.qr_code)}
                  helperText={touched.qr_code && errors.qr_code || "Scan QR code or enter manually to confirm attendance"}
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
                Confirm Attendance
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

        