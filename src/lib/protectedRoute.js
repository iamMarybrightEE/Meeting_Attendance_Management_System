'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import { AssignmentLate, ArrowBack } from '@mui/icons-material';

/**
 * ProtectedRoute component - ensures user is authenticated
 * If user is not authenticated, redirects to home page
 */
export function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, currentUser } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Check role if required
    if (requiredRole && currentUser?.role !== requiredRole) {
      router.push('/not-found');
      return;
    }
  }, [isAuthenticated, isLoading, currentUser, requiredRole, router]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (requiredRole && currentUser?.role !== requiredRole) {
    return null; // Will redirect in useEffect
  }

  return children;
}

/**
 * NotFoundPage component - displays 404 not found page
 */
export function NotFoundPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#f4f6f9',
        padding: '2rem',
      }}
    >
      <AssignmentLate sx={{ fontSize: 80, color: '#c0392b', mb: 2 }} />
      <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 700, color: '#004497', mb: 1 }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ color: '#666', mb: 2, textAlign: 'center' }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" sx={{ color: '#888', mb: 3, textAlign: 'center', maxWidth: 500 }}>
        You don't have permission to access this page. Please contact your system administrator if you believe this is an error.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ bgcolor: '#004497', '&:hover': { bgcolor: '#003580' } }}
        >
          Go Back
        </Button>
        {isAuthenticated && (
          <Button
            variant="outlined"
            onClick={() => router.push('/meetings')}
            sx={{ borderColor: '#004497', color: '#004497', '&:hover': { bgcolor: '#f0f7ff' } }}
          >
            Go to Meetings
          </Button>
        )}
      </Box>
    </Box>
  );
}
