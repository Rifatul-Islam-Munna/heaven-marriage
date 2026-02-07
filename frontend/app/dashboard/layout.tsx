"use client";

import { AppSidebar } from "@/components/custom/profile/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
const data = {
  navMain: [
    {
      title: "শুরু করুন",
      url: "/dashboard",
      items: [
        {
          title: "ব্যবহারকারী",
          url: "/dashboard",
        },
        {
          title: "প্রশ্নোত্তর",
          url: "/dashboard/faq",
        },
        {
          title: "নির্দেশিকা",
          url: "/dashboard/guideline",
        },
        {
          title: "যোগাযোগ",
          url: "/dashboard/contact",
        },
        {
          title: "ছবি",
          url: "/dashboard/images",
        },
        {
          title: "মূল্য",
          url: "/dashboard/pricing",
        },
      ],
    },
    {
      title: "সেটিংস",
      url: "/dashboard/settings",
      items: [
        {
          title: "প্রোফাইল সেটিংস",
          url: "/dashboard/settings",
        },
      ],
    },
  ],
};

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <AppSidebar data={data} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4  ">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default layout;
