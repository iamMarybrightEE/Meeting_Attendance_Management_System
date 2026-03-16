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
import { Close, Warning } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";

const appealSchema = Yup.object({
  decision: Yup.string().required("Decision is required"),
  comment: Yup.string(),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function AppealReviewModal({ open, appeal, meetingId, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (values, { setSubmitting }) => {
    setApiError("");
    try {
      const response = await fetch(`/api/meetings/${meetingId}/appeals/${appeal?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}`,
        },
        body: JSON.stringify({
          status: values.decision,
          review_notes: values.comment || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review appeal');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to review appeal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!appeal) return null;


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
          <Warning sx={{ color: "#fff", fontSize: 22 }} />
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
          >
            Review Appeal
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
          decision: "pending",
          comment: "",
        }}
        validationSchema={appealSchema}
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
              
              {/* Appeal Info */}
              <Box sx={{ bgcolor: "#f8f9fa", p: 2, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Employee: {appeal.profiles?.first_name} {appeal.profiles?.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reason: {appeal.reason.substring(0, 100)}{appeal.reason.length > 100 ? '...' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Submitted: {new Date(appeal.created_at).toLocaleString()}
                </Typography>
              </Box>

              {/* Full Reason */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Full Reason for Absence:
                </Typography>
                <Box sx={{ bgcolor: "#fff", p: 2, borderRadius: 2, border: "1px solid #e0e0e0", maxHeight: 120, overflowY: 'auto' }}>
                  <Typography variant="body2">
                    {appeal.reason}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* Decision */}
                <FormControl fullWidth size="small" sx={inputStyle} error={touched.decision && Boolean(errors.decision)}>
                  <InputLabel>Decision *</InputLabel>
                  <Select
                    name="decision"
                    value={values.decision}
                    label="Decision *"
                    onChange={handleChange}
                    onBlur={handleBlur}
                  >
                    <MenuItem value="approved">Approve (Excused)</MenuItem>
                    <MenuItem value="rejected">Reject (Not Excused)</MenuItem>
                  </Select>
                </FormControl>

                {/* Comment */}
                <TextField
                  fullWidth
                  size="small"
                  name="comment"
                  label="Comment (optional)"
                  multiline
                  rows={3}
                  placeholder="Enter your decision comment..."
                  value={values.comment}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.comment && Boolean(errors.comment)}
                  helperText={touched.comment && errors.comment}
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
                Submit Decision
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
          