"use client";

import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import NotificationsPageContent from "@/modules/meetings/pages/notificationsPageContent";
import { ProtectedRoute } from "@/lib/protectedRoute";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <NotificationsPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
