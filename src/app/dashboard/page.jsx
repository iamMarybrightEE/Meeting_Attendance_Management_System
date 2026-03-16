'use client';

import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '../../modules/dashboard/layout/dashboardLayout';
import DashboardPageContent from '../../modules/dashboard/pages/dashboardPageContent';
import { ProtectedRoute, NotFoundPage } from '@/lib/protectedRoute';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  // System admin only
  if (currentUser && currentUser.role !== 'System Administrator') {
    return <NotFoundPage />;
  }

  return (
    <ProtectedRoute requiredRole="System Administrator">
      <DashboardLayout>
        <DashboardPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
