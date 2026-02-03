import ProfileView from "@/components/custom/biodata/ProfileView";
import React from "react";

const page = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  console.log(params);
  return <ProfileView id={id} />;
};

export default page;
