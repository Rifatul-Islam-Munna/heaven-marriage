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
          title: "users",
          url: "/dashboard",
        },
        {
          title: "faq",
          url: "/dashboard/faq",
        },
        {
          title: "guideline",
          url: "/dashboard/guideline",
        },
        {
          title: "contact",
          url: "/dashboard/contact",
        },
      ],
    },
    {
      title: "সেটিংস",
      url: "/profile/settings",
      items: [
        {
          title: "প্রোফাইল সেটিংস",
          url: "/profile/settings",
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
