import DashboardLayout from "../../../modules/dashboard/layout/dashboardLayout";
import UserProfilePage from "../../../modules/userManagement/pages/userProfilePage";
import { USERS } from "../../../data/dummyData";

export function generateStaticParams() {
  return USERS.map((user) => ({ id: user.id }));
}

export default function UserProfile() {
  return (
    <DashboardLayout>
      <UserProfilePage />
    </DashboardLayout>
  );
}
