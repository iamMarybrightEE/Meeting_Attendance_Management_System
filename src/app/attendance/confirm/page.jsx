"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/modules/dashboard/layout/dashboardLayout";
import AttendanceConfirmPageContent from "@/modules/meetings/pages/attendanceConfirmPageContent";
import { Box, CircularProgress } from "@mui/material";

function AttendanceConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const meetingId = searchParams?.get('meeting_id');
  const token = searchParams?.get('token');

  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      const params = new URLSearchParams();
      params.set('redirect', `/attendance/confirm?meeting_id=${meetingId}&token=${token}`);
      router.push(`/?${params.toString()}`);
      return;
    }

    setIsReady(true);
  }, [currentUser, isLoading, meetingId, token, router]);

  if (isLoading || !isReady) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardLayout>
      <AttendanceConfirmPageContent meetingId={meetingId} token={token} />
    </DashboardLayout>
  );
}

export default function AttendanceConfirmPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <AttendanceConfirmContent />
    </Suspense>
  );
}
