'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { canAccessPage } from '@/lib/permissions';

/**
 * ProtectedRoute component - Protects pages from unauthorized access
 * Redirects to home (login) if not authenticated
 * Redirects to dashboard if trying to access unauthorized pages
 */
export function ProtectedRoute({ children, requiredRole = null, restrictedTo = null }) {
  const router = useRouter();
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (isLoading) return;
    
    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    // Check if user has required role
    if (requiredRole) {
      const hasRole = Array.isArray(requiredRole)
        ? requiredRole.includes(currentUser?.role)
        : currentUser?.role === requiredRole;
      
      if (!hasRole) {
        router.push('/meetings');
        return;
      }
    }
    
    // Check if user should be restricted from this page
    if (restrictedTo && !canAccessPage(currentUser, restrictedTo)) {
      router.push('/meetings');
      return;
    }
  }, [isLoading, isAuthenticated, currentUser, router, requiredRole, restrictedTo]);
  
  // Show loading while checking auth
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
  
  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  // Return children if all checks pass
  return children;
}

/**
 * NotFound component - Renders a 404 page
 */
export function NotFoundPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#f4f6f9',
        textAlign: 'center',
      }}
    >
      <Box sx={{ fontSize: '6rem', fontWeight: 'bold', color: '#004497' }}>404</Box>
      <Box sx={{ fontSize: '1.5rem', color: '#666', mb: 2 }}>Page Not Found</Box>
      <Box sx={{ color: '#999' }}>You don't have permission to access this page.</Box>
    </Box>
  );
}
