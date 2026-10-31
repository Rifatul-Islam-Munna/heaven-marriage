"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Gem } from "lucide-react";

export function AppSidebar({
  data,
}: {
  data: {
    navMain: {
      title: string;
      url: string;
      items: {
        title: string;
        url: string;
      }[];
    }[];
    ProfileTop?: {
      profileImage: string;
      name: string;
      isProfileIncomplete: boolean;
      profileCompletion: number;
      connections?: number;
    };
  };
}) {
  const pathName = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar side="left" beneathSiteHeader>
      <SidebarHeader>
        {data.ProfileTop && (
          <div className="flex flex-col gap-3 p-4 border-b">
            {/* Profile Image and Name */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
                <Image
                  src={data.ProfileTop.profileImage}
                  alt={data.ProfileTop.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {data.ProfileTop.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {data.ProfileTop.profileCompletion}% সম্পন্ন
                  </span>
                  {typeof data.ProfileTop.connections === "number" && <Link href="/profile/numbers" className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-700 hover:bg-pink-100">
                    <Gem className="h-3.5 w-3.5" aria-hidden />
                    {data.ProfileTop.connections.toLocaleString("bn-BD")} কানেকশন
                  </Link>}
                </div>
              </div>
            </div>

            {/* Profile Completion Progress */}
            <div className="space-y-2">
              <Progress
                value={data.ProfileTop.profileCompletion}
                className="h-2"
              />

              {data.ProfileTop.isProfileIncomplete && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                      আপনার প্রোফাইল সম্পূর্ণ করুন
                    </p>
                    <Link
                      href="/profile/my-profile"
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      এখনই সম্পূর্ণ করুন →
                    </Link>
                  </div>
                </div>
              )}

              {!data.ProfileTop.isProfileIncomplete && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                    প্রোফাইল সম্পূর্ণ হয়েছে!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="md:pt-4">
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathName === item.url}>
                      <Link href={item.url as Route} onClick={() => { if (isMobile) setOpenMobile(false); }} className="font-medium">{item.title}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
