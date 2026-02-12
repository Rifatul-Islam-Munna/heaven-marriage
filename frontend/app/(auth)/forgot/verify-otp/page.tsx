import VerifyAndResetPassword from "@/components/VerifyAndResetPassword";
import React, { Suspense } from "react";

const page = () => {
  return (
    <Suspense>
      <VerifyAndResetPassword />
    </Suspense>
  );
};

export default page;
