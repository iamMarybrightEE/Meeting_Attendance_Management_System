"use client";

import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import MeetingsPageContent from "@/modules/meetings/pages/meetingsPageContent";

export default function MeetingsPage() {
  return (
    <DashboardLayout>
      <MeetingsPageContent />
    </DashboardLayout>
  );
}
