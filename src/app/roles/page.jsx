'use client';

import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '../../modules/dashboard/layout/dashboardLayout';
import RolesPageContent from '../../modules/dashboard/pages/rolesPageContent';
import { ProtectedRoute, NotFoundPage } from '@/lib/protectedRoute';

export default function RolesPage() {
  const { currentUser } = useAuth();

  // System admin only
  if (currentUser && currentUser.role !== 'System Administrator') {
    return <NotFoundPage />;
  }

  return (
    <ProtectedRoute requiredRole="System Administrator">
      <DashboardLayout>
        <RolesPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
