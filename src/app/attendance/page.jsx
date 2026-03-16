"use client";

import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import AttendancePageContent from "@/modules/meetings/pages/attendancePageContent";
import { ProtectedRoute } from "@/lib/protectedRoute";

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AttendancePageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
