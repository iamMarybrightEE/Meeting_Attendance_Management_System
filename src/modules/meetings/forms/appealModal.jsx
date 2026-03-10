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
  InputAdornment,
  
} from "@mui/material";
import { Close, Warning, AttachFile ,
   } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";

const appealSchema = Yup.object({
  reason: Yup.string().min(10, "Reason must be at least 10 characters").required("Reason is required"),
  attachment: Yup.string(),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function AppealModal({ open, onClose, meeting, onSubmit }) {
  const { currentUser } = useAuth();
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (values, { setSubmitting }) => {
    setApiError("");
    try {
      console.log("Submitting appeal:", {
        meetingId: meeting?.id,
        userId: currentUser?.id,
        ...values,
      });
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
          borderRadius: 3,
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #856404 0%, #f57c00 100%)",
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
            Submit Appeal
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
          reason: "",
          attachment: "",
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

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Submit an appeal for <strong>{meeting?.title}</strong> on{" "}
                <strong>{meeting?.date}</strong>.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
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
                  sx={inputStyle}
                />

                <TextField
                    fullWidth
                    size="small"
                    name="attachment"
                    label="Attachment / Reference"
                    placeholder="Upload a document"
                    value={values.attachment ? values.attachment.name : ""}
                    InputProps={{
                        readOnly: true, // so user can't type in it
                        endAdornment: (
                        <InputAdornment position="end">
                            <IconButton component="label">
                            <AttachFile />
                            <input
                                hidden
                                type="file"
                                onChange={handleChange}
                            />
                            </IconButton>
                        </InputAdornment>
                        ),
                    }}
                    onBlur={handleBlur}
                    error={touched.attachment && Boolean(errors.attachment)}
                    helperText={touched.attachment && errors.attachment}
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
                  background: "linear-gradient(135deg, #856404 0%, #f57c00 100%)",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                  display: "flex",
                  gap: 1,
                  "&:hover": {
                    background: "linear-gradient(135deg, #6d5203, #e67e00)",
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