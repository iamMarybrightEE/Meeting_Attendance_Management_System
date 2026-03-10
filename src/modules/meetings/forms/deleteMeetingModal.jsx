"use client";

import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Divider,
  IconButton,
} from "@mui/material";
import { Delete, Close } from "@mui/icons-material";

export default function DeleteMeetingModal({
  open,
  onClose,
  selectedMeeting,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #f74a4d 0%, #d32f2f 100%)",
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Delete sx={{ color: "#fff", fontSize: 22 }} />
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
          >
            Delete Meeting
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
      <DialogContent sx={{ pt: 3 }}>
        <Typography>
          Are you sure you want to delete <strong>{selectedMeeting?.title}</strong>?
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
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
          variant="contained"
          onClick={onSubmit}
          sx={{
            borderRadius: 2,
            background: "linear-gradient(135deg, #f74a4d 0%, #d32f2f 100%)",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": {
              background: "linear-gradient(135deg, #c62828 0%, #d32f2f 100%)",
            },
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}