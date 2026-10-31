"use client";

import { AppSidebar } from "@/components/custom/profile/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TiThMenu } from "react-icons/ti";
import { useMemo } from "react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { User } from "@/@types/user";

const SidebarHeader = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-start gap-2 border-b px-4"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="প্রোফাইল মেনু খুলুন বা বন্ধ করুন"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-gray-800 transition-colors hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-pink-600"
      >
        <TiThMenu className="h-5 w-5" aria-hidden />
        <span className="text-sm font-semibold">মেনু</span>
      </button>
    </header>
  );
};

// Sidebar itself owns responsive desktop/mobile rendering. One instance keeps
// its state and avoids rendering the wrong panel while hydration completes.
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: user } = useQueryWrapper<User>(
    ["get-my-profile-for-success"],
    "/user/get-my-profile",
  );

  // Use the backend's live admin-managed question completion calculation.
  const profileCompletion = Math.max(0, Math.min(100, Number(user?.completion?.percentage) || 0));
  const isProfileIncomplete = profileCompletion < 100;

  // Create userObject with useMemo to avoid unnecessary recalculations
  const userObject = useMemo(
    () => ({
      profileImage: user?.gender === "male" ? "/male.png" : "/female.png",
      name: user?.name || "ব্যবহারকারী",
      isProfileIncomplete: isProfileIncomplete,
      profileCompletion: profileCompletion,
      connections: user?.numberOfConnections,
    }),
    [user, isProfileIncomplete, profileCompletion],
  );

  // Create data object with ProfileTop dynamically
  const sidebarData = useMemo(
    () => ({
      navMain: [
        {
          title: "শুরু করুন",
          url: "/profile",
          items: [
            { title: "নিজে বায়োডাটা পূরণ করুন", url: "/profile/my-profile" },
            { title: "AI দিয়ে বায়োডাটা পূরণ", url: "/profile/ai-profile" },
            {
              title: "আমার প্রোফাইল",
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
      ProfileTop: userObject,
    }),
    [userObject],
  );

  return (
    <SidebarProvider>
      <AppSidebar data={sidebarData} />
      <SidebarInset className="w-full min-w-0">
        <SidebarHeader />
        <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
