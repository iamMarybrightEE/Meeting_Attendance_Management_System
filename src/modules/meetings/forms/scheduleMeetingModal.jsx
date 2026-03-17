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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
} from "@mui/material";
import { Event, Close, CalendarToday, AccessTime } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { isSystemAdmin, isAdmin, isChairperson } from "../../../lib/permissions";


const meetingSchema = Yup.object({
  title: Yup.string()
    .min(3, "Title too short")
    .required("Meeting title is required"),
  date: Yup.string()
    .required("Date is required"),
  startTime: Yup.string()
    .required("Start time is required"),
  endTime: Yup.string()
    .required("End time is required"),
  duration: Yup.number()
    .positive("Duration must be positive")
    .required("Duration is required"),
  location: Yup.string()
    .min(2, "Location too short")
    .required("Location is required"),
  type: Yup.string()
    .required("Meeting type is required"),
  category: Yup.string()
    .required("Category is required"),
  chairpersonId: Yup.string()
    .uuid("Invalid chairperson")
    .required("Chairperson is required"),
  attendeeIds: Yup.array()
    .of(Yup.string().uuid())
    .min(1, "At least one attendee is required"),
  description: Yup.string(),
  externalLink: Yup.string()
    .url("Invalid URL")
    .nullable(),
});

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1c56a3" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#004497" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#004497" },
};

export default function ScheduleMeetingModal({
  open,
  onClose,
  onSuccess,
}) {
  const { users, currentUser } = useAuth();
  const [apiError, setApiError] = useState("");

  // Check if user is staff (not admin or system admin or chairperson)
  const isStaff = !isSystemAdmin(currentUser) && !isAdmin(currentUser) && !isChairperson(currentUser);
  
  // Create dynamic schema based on user role
  const dynamicSchema = Yup.object({
    title: Yup.string()
      .min(3, "Title too short")
      .required("Meeting title is required"),
    date: Yup.string()
      .required("Date is required"),
    startTime: Yup.string()
      .required("Start time is required"),
    endTime: Yup.string()
      .required("End time is required"),
    duration: Yup.number()
      .positive("Duration must be positive")
      .required("Duration is required"),
    location: Yup.string()
      .min(2, "Location too short")
      .required("Location is required"),
    type: Yup.string()
      .required("Meeting type is required"),
    category: Yup.string()
      .required("Category is required"),
    chairpersonId: isStaff ? Yup.string() : Yup.string()
      .uuid("Invalid chairperson")
      .required("Chairperson is required"),
    attendeeIds: Yup.array()
      .of(Yup.string().uuid())
      .min(1, "At least one attendee is required"),
    description: Yup.string(),
    externalLink: Yup.string()
      .url("Invalid URL")
      .nullable(),
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setApiError("");
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('mams_access_token')}` },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          date: values.date,
          start_time: values.startTime,
          end_time: values.endTime,
          duration: values.duration,
          type: values.type,
          category: values.category,
          location: values.location,
          chairperson_id: values.chairpersonId,
          attendee_ids: values.attendeeIds,
          external_link: values.externalLink || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to schedule meeting');
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to schedule meeting. Please try again.");
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
          background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Event sx={{ color: "#fff", fontSize: 22 }} />
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
          >
            Schedule New Meeting
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
          title: "",
          date: "",
          startTime: "",
          endTime: "",
          duration: "",
          location: "",
          type: "management",
          category: "internal",
          chairpersonId: isStaff ? currentUser?.id : "",
          attendeeIds: [],
          description: "",
          externalLink: "",
        }}
        validationSchema={dynamicSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setValues }) => {
          const handleTimeChange = (e) => {
            const { name, value } = e.target;
            handleChange(e);
            
            // Auto-calculate duration when time fields change
            const startTime = name === 'startTime' ? value : values.startTime;
            const endTime = name === 'endTime' ? value : values.endTime;
            
            if (startTime && endTime) {
              const [startHour, startMin] = startTime.split(':').map(Number);
              const [endHour, endMin] = endTime.split(':').map(Number);
              
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              
              let duration = endMinutes - startMinutes;
              if (duration <= 0) duration += 24 * 60; // Handle next day
              
              setValues({ ...values, [name]: value, duration });
            }
          };

          return (
            <Form noValidate>
              <DialogContent sx={{ p: 3 }}>
                {apiError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {apiError}
                  </Alert>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    name="title"
                    label="Meeting Title *"
                    value={values.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.title && Boolean(errors.title)}
                    helperText={touched.title && errors.title}
                    sx={inputStyle}
                  />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    name="date"
                    label="Date *"
                    type="date"
                    value={values.date}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.date && Boolean(errors.date)}
                    helperText={touched.date && errors.date}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <CalendarToday sx={{ mr: 1, fontSize: 18, color: "#004497" }} />
                    }}
                    sx={inputStyle}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    name="location"
                    label="Location *"
                    value={values.location}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.location && Boolean(errors.location)}
                    helperText={touched.location && errors.location}
                    sx={inputStyle}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    name="startTime"
                    label="Start Time *"
                    type="time"
                    value={values.startTime}
                    onChange={handleTimeChange}
                    onBlur={handleBlur}
                    error={touched.startTime && Boolean(errors.startTime)}
                    helperText={touched.startTime && errors.startTime}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <AccessTime sx={{ mr: 1, fontSize: 18, color: "#004497" }} />
                    }}
                    sx={inputStyle}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    name="endTime"
                    label="End Time *"
                    type="time"
                    value={values.endTime}
                    onChange={handleTimeChange}
                    onBlur={handleBlur}
                    error={touched.endTime && Boolean(errors.endTime)}
                    helperText={touched.endTime && errors.endTime}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <AccessTime sx={{ mr: 1, fontSize: 18, color: "#004497" }} />
                    }}
                    sx={inputStyle}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <FormControl fullWidth size="small" sx={inputStyle} error={touched.type && Boolean(errors.type)}>
                    <InputLabel>Meeting Type *</InputLabel>
                    <Select
                      name="type"
                      value={values.type}
                      label="Meeting Type *"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <MenuItem value="management">Management</MenuItem>
                      <MenuItem value="team">Team</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small" sx={inputStyle} error={touched.category && Boolean(errors.category)}>
                    <InputLabel>Category *</InputLabel>
                    <Select
                      name="category"
                      value={values.category}
                      label="Category *"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <MenuItem value="internal">Internal</MenuItem>
                      <MenuItem value="external">External</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    name="duration"
                    label="Duration (minutes) *"
                    type="number"
                    value={values.duration}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.duration && Boolean(errors.duration)}
                    helperText={touched.duration && errors.duration}
                    sx={inputStyle}
                    inputProps={{ min: 1 }}
                  />
                  {(isSystemAdmin(currentUser) || isAdmin(currentUser)) && (
                    <Autocomplete
                      options={users || []}
                      getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} (${option.email})`.trim()}
                      value={users?.find(u => u.id === values.chairpersonId) || null}
                      onChange={(event, newValue) => {
                        handleChange({ target: { name: 'chairpersonId', value: newValue?.id || '' } });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Chairperson *"
                          error={touched.chairpersonId && Boolean(errors.chairpersonId)}
                          helperText={touched.chairpersonId && errors.chairpersonId}
                          sx={inputStyle}
                          size="small"
                        />
                      )}
                      sx={inputStyle}
                    />
                  )}
                  {isStaff && (
                    <TextField
                      fullWidth
                      size="small"
                      label="Chairperson (Auto-assigned as organizer)"
                      value={`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()}
                      disabled
                      sx={inputStyle}
                      helperText="You are automatically the chairperson"
                    />
                  )}
                  {isChairperson(currentUser) && (
                    <TextField
                      fullWidth
                      size="small"
                      label="Chairperson (Auto-assigned)"
                      value={`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()}
                      disabled
                      sx={inputStyle}
                      helperText="You are the chairperson"
                    />
                  )}
                </Box>
                <Autocomplete
                  multiple
                  options={users || []}
                  getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} (${option.email})`.trim()}
                  value={values.attendeeIds.map(id => users?.find(u => u.id === id)).filter(Boolean)}
                  onChange={(event, newValue) => {
                    const newIds = newValue.map(user => user.id);
                    handleChange({ target: { name: 'attendeeIds', value: newIds } });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Attendees *"
                      error={touched.attendeeIds && Boolean(errors.attendeeIds)}
                      helperText={touched.attendeeIds && errors.attendeeIds}
                      sx={inputStyle}
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={`${option.firstName || ''} ${option.lastName || ''}`.trim()}
                          {...chipProps}
                          size="small"
                        />
                      );
                    })
                  }
                  sx={inputStyle}
                />
                <TextField
                  fullWidth
                  size="small"
                  name="externalLink"
                  label="External Link"
                  type="url"
                  placeholder="https://example.com"
                  value={values.externalLink}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.externalLink && Boolean(errors.externalLink)}
                  helperText={touched.externalLink && errors.externalLink}
                  sx={inputStyle}
                />

                <TextField
                  fullWidth
                  size="small"
                  name="description"
                  multiline
                  rows={3}
                  label="Description"
                  placeholder="Enter meeting details..."
                  value={values.description}
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
                Schedule Meeting
              </Button>
            </DialogActions>
          </Form>
        );
        }}
      </Formik>
    </Dialog>
  );
}
            
