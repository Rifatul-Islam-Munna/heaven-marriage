import AdminUsersTable from "@/components/custom/dashboard/AdminUsersTable";
import React, { Suspense } from "react";

const page = () => {
  return (
    <Suspense>
      <AdminUsersTable />
    </Suspense>
  );
};

export default page;
