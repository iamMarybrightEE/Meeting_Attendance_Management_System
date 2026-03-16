"use client";

import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import MeetingsPageContent from "@/modules/meetings/pages/meetingsPageContent";
import { ProtectedRoute } from "@/lib/protectedRoute";

export default function MeetingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MeetingsPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
