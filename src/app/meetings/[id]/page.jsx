"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import MeetingsDetailsPageContent from "@/modules/meetings/pages/meetingsDetailsPageContent";
import { ProtectedRoute } from "@/lib/protectedRoute";

export default function MeetingsPage() {
  const params = useParams();
  
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MeetingsDetailsPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
