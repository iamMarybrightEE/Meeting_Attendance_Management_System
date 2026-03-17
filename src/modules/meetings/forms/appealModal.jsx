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
  TextField,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Close, Warning, Upload, AttachFile } from "@mui/icons-material";

const appealSchema = Yup.object({
  reason: Yup.string().min(10, "Reason must be at least 10 characters").required("Reason is required"),
  document: Yup.mixed().nullable().optional(),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function AppealModal({ open, onClose, meeting, onSubmit, existingAppeal }) {
  const [apiError, setApiError] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  // Don't allow opening if appeal already exists and is not rejected
  if (existingAppeal && existingAppeal.status !== 'rejected') {
    return null;
  }

  const handleFileChange = (event, setFieldValue) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setApiError("File size must be less than 10MB");
        return;
      }
      setUploadedFile(file);
      setFieldValue("document", file);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setApiError("");
    try {
      const formData = new FormData();
      formData.append("reason", values.reason);
      if (uploadedFile) {
        formData.append("document", uploadedFile);
      }

      const response = await fetch(`/api/meetings/${meeting?.id}/appeals`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit appeal');
      }

      onSubmit?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to submit appeal. Please try again.");
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
          borderRadius: 4,
          boxShadow: "0 16px 48px rgba(44,62,80,0.18)",
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(90deg, #f57c00 0%, #ffb300 100%)",
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Warning sx={{ color: "#fff", fontSize: 26 }} />
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", letterSpacing: 0.5 }}
          >
            Submit Appeal
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: "#fff",
            background: "rgba(255,255,255,0.12)",
            "&:hover": { background: "rgba(255,255,255,0.22)" },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Formik
        initialValues={{
          reason: "",
          document: null,
        }}
        validationSchema={appealSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => (
          <Form noValidate>
            <DialogContent sx={{ p: 4, bgcolor: "#f8fafc" }}>
              {apiError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {apiError}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: 15 }}>
                Submit an appeal for <strong>{meeting?.title}</strong> on{" "}
                <strong>{meeting?.date}</strong>.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="reason"
                  label="Reason for Appeal *"
                  multiline
                  rows={4}
                  placeholder="Explain why you were absent..."
                  value={values.reason}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.reason && Boolean(errors.reason)}
                  helperText={touched.reason && errors.reason}
                  sx={{
                    ...inputStyle,
                    bgcolor: "#fff",
                    borderRadius: 2,
                  }}
                />

                {/* Document Upload Section */}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: "#1a1a2e" }}>
                    Supporting Document <span style={{ fontWeight: 400 }}>(Optional)</span>
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      textAlign: "center",
                      border: "2px dashed #e0e7ef",
                      borderRadius: 2.5,
                      bgcolor: "#f4f7fb",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "block",
                      "&:hover": {
                        borderColor: "#f57c00",
                        bgcolor: "#fff8e1",
                      },
                      boxShadow: "none",
                    }}
                    component="label"
                  >
                    <input
                      hidden
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      type="file"
                      onChange={(e) => handleFileChange(e, setFieldValue)}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 1 }}>
                      <Upload sx={{ fontSize: 30, color: "#f57c00" }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>
                        PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#f57c00" }}>
                      Click to upload or drag and drop
                    </Typography>
                  </Paper>

                  {uploadedFile && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "#e6f9ee",
                        border: "1px solid #43a047",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <AttachFile sx={{ color: "#43a047", fontSize: 22 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#388e3c" }}>
                          {uploadedFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 4, py: 2.5, gap: 1 }}>
              <Button
                onClick={onClose}
                variant="outlined"
                disabled={isSubmitting}
                sx={{
                  borderRadius: 2,
                  borderColor: "#e0e7ef",
                  color: "#555",
                  textTransform: "none",
                  fontWeight: 500,
                  px: 2.5,
                  "&:hover": { borderColor: "#f57c00", color: "#f57c00" },
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
                  background: "linear-gradient(90deg, #f57c00 0%, #ffb300 100%)",
                  textTransform: "none",
                  fontWeight: 700,
                  px: 4,
                  boxShadow: "0 2px 8px rgba(245,124,0,0.08)",
                  display: "flex",
                  gap: 1,
                  "&:hover": {
                    background: "linear-gradient(90deg, #e65100 0%, #ffb300 100%)",
                  },
                }}
              >
                {isSubmitting && <CircularProgress size={20} sx={{ color: "#fff" }} />}
                Submit Appeal
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
            