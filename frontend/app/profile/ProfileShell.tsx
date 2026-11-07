"use client";

import { AppSidebar } from "@/components/custom/profile/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TiThMenu } from "react-icons/ti";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { User } from "@/@types/user";
import { currentBiodataStage,profileCompletion as completionPercentage } from "@/lib/biodata-status";

const SidebarHeader = () => {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const mobileLinks = [
    {href:"/profile",label:"ড্যাশবোর্ড"},
    {href:"/profile/my-profile",label:"বায়োডাটা গেম"},
    {href:"/profile/matches",label:"স্মার্ট ম্যাচ"},
    {href:"/profile/recommendations",label:"সুপারিশ"},
    {href:"/profile/settings",label:"সেটিংস"},
  ] as const;

  return (
    <header
      className="flex h-16 min-w-0 shrink-0 items-center justify-start gap-2 overflow-hidden border-b px-2 sm:px-4"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="প্রোফাইল মেনু খুলুন বা বন্ধ করুন"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-gray-800 transition-colors hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-pink-600"
      >
        <TiThMenu className="h-5 w-5" aria-hidden />
        <span className="hidden text-sm font-semibold sm:inline">মেনু</span>
      </button>
      <nav aria-label="মোবাইল প্রোফাইল নেভিগেশন" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain md:hidden">
        {mobileLinks.map(item=><Link key={item.href} href={item.href}
          aria-current={pathname===item.href?"page":undefined}
          className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${pathname===item.href?"bg-pink-600 text-white":"bg-pink-50 text-pink-800"}`}>
          {item.label}
        </Link>)}
      </nav>
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
  const profileCompletion=completionPercentage(user);
  const requiredCount=user?.completion?.requiredCount??user?.completionRequiredCount??0;
  const answeredCount=user?.completion?.answeredCount??user?.completionAnsweredCount??0;
  const stage = currentBiodataStage(user);
  const isProfileIncomplete = user?.role === "user" && profileCompletion < 100 && stage === "draft";

  // Create userObject with useMemo to avoid unnecessary recalculations
  const userObject = useMemo(
    () => ({
      profileImage: user?.gender === "male" ? "/male.png" : "/female.png",
      name: user?.name || "ব্যবহারকারী",
      isProfileIncomplete: isProfileIncomplete,
      profileCompletion: profileCompletion,
      requiredCount,answeredCount,
      biodataStage: stage,
      connections: user?.numberOfConnections,
    }),
    [user, isProfileIncomplete, profileCompletion, requiredCount, answeredCount, stage],
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
            ...(user?.role === "user"
              ? [{ title: "স্মার্ট ম্যাচিং", url: "/profile/matches" },
                  { title: "এজেন্সির সুপারিশ", url: "/profile/recommendations" }]
              : []),
            {
              title: "আমার সংযোগ",
              url: "/profile/numbers",
            },
          ],
        },
        ...(user?.role === "user" ? [{
          title: "ফেভারিট",
          url: "/profile/short-list",
          items: [
            { title: "আমার ফেভারিট", url: "/profile/short-list", icon: "heart" },
            { title: "আমাকে ফেভারিট করেছেন", url: "/profile/favourited-me", icon: "heart-handshake" },
          ],
        }] : []),
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
    [userObject, user?.role],
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar data={sidebarData} />
      <SidebarInset className="w-full min-w-0">
        <SidebarHeader />
        <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
