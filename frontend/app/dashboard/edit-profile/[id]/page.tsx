import ProfileUpdateForm from "@/components/edit-profile/Profile-Update-Admin";
import React from "react";

const page = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  console.log("id-ofpage", id);
  return <ProfileUpdateForm id={id} />;
};

export default page;
