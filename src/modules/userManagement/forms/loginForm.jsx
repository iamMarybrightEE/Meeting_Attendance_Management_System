"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  TextField,
  Button,
  Typography,
  Box,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";

const loginSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoginError("");
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    const result = login(values.email, values.password);
    setSubmitting(false);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: { xs: "100vh", lg: "auto" },
        p: { xs: 3, sm: 4 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          overflow: "hidden",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          animation: "slideUp 0.5s ease forwards",
          "@keyframes slideUp": {
            from: { opacity: 0, transform: "translateY(24px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {/* Header Strip */}
        <Box
          sx={{
            // background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: "#004497", fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ color: "#004497", mt: 0.5 }}>
            Sign in to URA MAMS
          </Typography>
        </Box>

        <Box sx={{ p: 3.5 }}>
          {loginError && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.82rem" }}
              onClose={() => setLoginError("")}
            >
              {loginError}
            </Alert>
          )}

          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
              <Form noValidate>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    fullWidth
                    name="email"
                    label="Email Address"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: "#004497", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#1c56a3",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#004497",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#004497",
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: "#004497", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? (
                              <VisibilityOff sx={{ fontSize: 20 }} />
                            ) : (
                              <Visibility sx={{ fontSize: 20 }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#1c56a3",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#004497",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#004497",
                      },
                    }}
                  />

                  

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      py: 1.4,
                      borderRadius: 2,
                      background: "linear-gradient(135deg, #004497 0%, #1c56a3 100%)",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      textTransform: "none",
                      boxShadow: "0 4px 14px rgba(0,68,151,0.35)",
                      transition: "all 0.2s",
                      "&:hover": {
                        background: "linear-gradient(135deg, #003380 0%, #1549a0 100%)",
                        boxShadow: "0 6px 18px rgba(0,68,151,0.45)",
                        transform: "translateY(-1px)",
                      },
                      "&:active": { transform: "translateY(0)" },
                      "&:disabled": { opacity: 0.75 },
                    }}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={22} sx={{ color: "#fff" }} />
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </Box>
              </Form>
            )}
          </Formik>

          {/* Demo credentials hint */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: "#f0f4ff",
              border: "1px solid #dae3f4",
            }}
          >
            <Typography variant="caption" sx={{ color: "#004497", fontWeight: 600, display: "block", mb: 0.5 }}>
              Demo Credentials
            </Typography>
            <Typography variant="caption" sx={{ color: "#555", display: "block" }}>
              Email: sarah.nakamura@ura.go.ug
            </Typography>
            <Typography variant="caption" sx={{ color: "#555", display: "block" }}>
              Password: any password works
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
