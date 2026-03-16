"use client";

import DashboardLayout from "../../../modules/dashboard/layout/dashboardLayout";
import UserProfilePage from "../../../modules/userManagement/pages/userProfilePage";
import { ProtectedRoute } from "../../../lib/protectedRoute";

export default function UserProfile() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <UserProfilePage />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
