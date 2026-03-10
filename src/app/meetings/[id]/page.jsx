"use client";

import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import MeetingsDetailsPageContent from "@/modules/meetings/pages/meetingsDetailsPageContent";

export default function MeetingsPage() {
  return (
    <DashboardLayout>
      <MeetingsDetailsPageContent />
    </DashboardLayout>
  );
}
