import AdminUsersTable from "@/components/custom/dashboard/AdminUsersTable";
import Link from "next/link";
import React, { Suspense } from "react";

const page = () => {
  return (
    <Suspense>
      <div className="p-4 flex flex-wrap gap-4">
        <Link
          href="/dashboard/settings#messenger-settings"
          className="text-pink-600 underline"
        >
          Landing Page Messenger URL
        </Link>
        <Link href="/dashboard/upgrades" className="text-pink-600 underline">
          Service requests, connection history, reminders & settings
        </Link>
      </div>
      <AdminUsersTable />
    </Suspense>
  );
};

export default page;
