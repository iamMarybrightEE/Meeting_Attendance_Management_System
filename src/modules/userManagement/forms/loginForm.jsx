"use client";

import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useState } from "react";


// Validation schema
const LoginSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),

  password: Yup.string()
    .required("Password is required"),
});


export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Box className="flex items-center justify-center min-h-screen bg-animated-gradient">
      <Paper elevation={6} sx={{ padding: 4, width: 400 }}>
        
        <Typography 
            variant="h5"
            fontWeight={600}
            lineHeight={1.2}
            letterSpacing="-0.01em"
            marginBottom={2}
        >
            MAMS
        </Typography>

        <Typography
            variant="body2"
            color="text.secondary"
        >
            Enter your credentials to sign in to your account.
        </Typography>

        <Formik
          initialValues={{
            email: "",
            password: "",
          }}

          validationSchema={LoginSchema}

          onSubmit={(values, { setSubmitting }) => {
            console.log(values);
            setSubmitting(false);
          }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isSubmitting,
          }) => (

            <Form>

              {/* Email */}
              <TextField
                fullWidth
                margin="normal"
                label="Email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email && errors.email}
                
              />


              {/* Password */}
              <TextField
                fullWidth
                margin="normal"
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password}

                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                      >
                        {showPassword
                          ? <VisibilityOff />
                          : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />


              {/* Button */}
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                type="submit"
                disabled={isSubmitting}
              >
                Login
              </Button>

            </Form>

          )}
        </Formik>

      </Paper>
    </Box>
  );
}