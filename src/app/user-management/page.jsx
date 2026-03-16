'use client';

import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '../../modules/dashboard/layout/dashboardLayout';
import UserManagementPage from '../../modules/userManagement/pages/userManagementPage';
import { ProtectedRoute, NotFoundPage } from '@/lib/protectedRoute';

export default function UserManagement() {
  const { currentUser } = useAuth();

  // System admin only
  if (currentUser && currentUser.role !== 'System Administrator') {
    return <NotFoundPage />;
  }

  return (
    <ProtectedRoute requiredRole="System Administrator">
      <DashboardLayout>
        <UserManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
