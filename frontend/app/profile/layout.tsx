"use client";

import { AppSidebar } from "@/components/custom/profile/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TiThMenu } from "react-icons/ti";
import { useEffect, useState } from "react";

const data = {
  navMain: [
    {
      title: "শুরু করুন",
      url: "/profile",
      items: [
        {
          title: "প্রোফাইল",
          url: "/profile",
        },
        {
          title: "প্রিয় তালিকা",
          url: "/profile/short-list",
        },
        {
          title: "আমার সংযোগ",
          url: "/profile/numbers",
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

const SidebarHeader = ({ isMobile }: { isMobile: boolean }) => {
  const { toggleSidebar } = useSidebar();

  return (
    <header
      className={`flex h-16 shrink-0 items-center gap-2 border-b px-4 ${
        isMobile ? "justify-end" : "justify-start"
      }`}
    >
      <TiThMenu
        onClick={toggleSidebar}
        className="h-6 w-6 font-bold cursor-pointer hover:opacity-70 transition-opacity"
      />
    </header>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const sidebarSide = isMobile ? "right" : "left";

  return (
    <SidebarProvider side={sidebarSide}>
      {!isMobile && <AppSidebar data={data} side="left" />}
      <SidebarInset className="w-full">
        <SidebarHeader isMobile={isMobile} />
        <div className="flex flex-1 flex-col gap-4">{children}</div>
      </SidebarInset>
      {isMobile && <AppSidebar data={data} side="right" />}
    </SidebarProvider>
  );
};

export default Layout;
