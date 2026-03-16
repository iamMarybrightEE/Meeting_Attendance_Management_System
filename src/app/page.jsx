'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '../modules/userManagement/forms/loginForm';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check if there's an attendance confirmation redirect
    const redirectUrl = searchParams.get('redirect');
    if (isAuthenticated && redirectUrl && redirectUrl.includes('/attendance/confirm')) {
      // Allow attendance confirmation link redirect regardless of auth status
      router.push(decodeURIComponent(redirectUrl));
      return;
    }

    // If already authenticated and no special redirect, go to meetings
    if (isAuthenticated) {
      router.push('/meetings');
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f4f6f9',
        }}
      >
        <CircularProgress sx={{ color: '#004497' }} />
      </Box>
    );
  }

  // If authenticated, don't show anything (will redirect in useEffect)
  if (isAuthenticated) {
    return null;
  }

  // Show login form for unauthenticated users
  return (
    <main className="bg-animated-gradient lg:grid grid-cols-2 min-h-screen items-center justify-center w-full text-center">
      <div className="hidden bg-background h-full w-full lg:flex flex-col items-center justify-center">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-white/5 animate-morph" />
          <div className="absolute bottom-[10%] right-[5%] w-48 h-48 rounded-full bg-white/5 animate-morph delay-500" />
          <div className="absolute top-[60%] left-[50%] w-32 h-32 rounded-full bg-white/5 animate-float-slow" />
        </div>
        <Image
          src="/URA-logo.png"
          alt="Logo"
          width={400}
          height={400}
          className="mb-4"
          priority
        />
      </div>
      <LoginForm />
    </main>
  );
}


