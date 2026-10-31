import AdminUsersTable from "@/components/custom/dashboard/AdminUsersTable";
import Link from "next/link";
import React, { Suspense } from "react";
import {dashboardLanding} from '@/lib/dashboard-session';

const page = async () => {
  const session=await dashboardLanding();
  return (
    <Suspense>
      <div className="p-4 flex flex-wrap gap-4">
        {session.permissions.includes("settings")&&<Link
          href="/dashboard/settings#messenger-settings"
          className="text-pink-600 underline"
        >
          Landing Page Messenger URL
        </Link>}
        {session.permissions.includes("upgrades")&&<Link href="/dashboard/upgrades" className="text-pink-600 underline">
          Service requests, connection history, reminders & settings
        </Link>}
      </div>
      <AdminUsersTable />
    </Suspense>
  );
};

export default page;
