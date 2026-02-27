import DashboardLayout from "../../modules/dashboard/layout/dashboardLayout";
import UserManagementPage from "../../modules/userManagement/pages/userManagementPage";

export default function UserManagement() {
  return (
    <DashboardLayout>
      <UserManagementPage />
    </DashboardLayout>
  );
}
