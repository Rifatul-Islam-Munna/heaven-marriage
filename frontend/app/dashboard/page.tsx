import { Suspense } from "react";
import AdminUsersTable from "@/components/custom/dashboard/AdminUsersTable";
import { dashboardLanding } from "@/lib/dashboard-session";

export default async function DashboardHomePage() {
  const session = await dashboardLanding();
  const quickLinks = [
    ...(session.permissions.includes("upgrades") ? [{ href: "/dashboard/upgrades", label: "Services & payments" }] : []),
    ...(session.permissions.includes("settings") ? [{ href: "/dashboard/settings#messenger-settings", label: "Messenger settings" }] : []),
  ];
  return (
    <Suspense>
      <AdminUsersTable quickLinks={quickLinks} />
    </Suspense>
  );
}