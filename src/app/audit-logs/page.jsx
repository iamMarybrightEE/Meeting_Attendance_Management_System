'use client';

import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '../../modules/dashboard/layout/dashboardLayout';
import AuditLogsPageContent from '../../modules/dashboard/pages/auditLogsPageContent';
import { ProtectedRoute, NotFoundPage } from '@/lib/protectedRoute';

export default function AuditLogsPage() {
  const { currentUser } = useAuth();

  // System admin only
  if (currentUser && currentUser.role !== 'System Administrator') {
    return <NotFoundPage />;
  }

  return (
    <ProtectedRoute requiredRole="System Administrator">
      <DashboardLayout>
        <AuditLogsPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
