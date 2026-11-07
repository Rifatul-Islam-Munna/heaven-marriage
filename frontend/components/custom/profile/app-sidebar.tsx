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
import { AlertCircle, Gem, Heart, HeartHandshake, ChevronDown, ChevronRight, UsersRound, CreditCard, PanelsTopLeft, Headset, Settings2 } from "lucide-react";

type NavGroupEntry={title:string;url:string;items:{title:string;url:string;icon?:string}[]};
function GroupNavigation({group,collapsible,isMobile,closeMobile,pathName}:{
  group:NavGroupEntry;collapsible:boolean;isMobile:boolean;closeMobile:()=>void;pathName:string;
}){
  const groupActive=group.items.some(item=>
    pathName===item.url||(item.url!=='/dashboard'&&pathName.startsWith(item.url+'/')));
  const [open,setOpen]=React.useState(!collapsible||groupActive);
  React.useEffect(()=>{if(groupActive)setOpen(true);},[groupActive]);
  const Icon=group.title.includes('ম্যাচিং')?UsersRound:
    group.title.includes('পেমেন্ট')?CreditCard:
    group.title.includes('কনটেন্ট')?PanelsTopLeft:
    group.title.includes('সহায়তা')?Headset:Settings2;
  return <SidebarGroup className="gap-0.5">
    <SidebarGroupLabel className="h-auto px-2 py-1">
      {collapsible?
        <button type="button" onClick={()=>setOpen(value=>!value)}
          aria-expanded={open} aria-label={group.title+' নেভিগেশন'}
          className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
          <Icon className="size-4 shrink-0 text-rose-500" aria-hidden/>
          <span className="min-w-0 flex-1">{group.title}</span>
          <ChevronDown size={15} className={open?'transition-transform':'-rotate-90 transition-transform'} aria-hidden/>
        </button>:
        <span className="text-[12px] font-semibold">{group.title}</span>}
    </SidebarGroupLabel>
    {open&&<SidebarGroupContent>
      <SidebarMenu className="gap-0.5">
        {group.items.map(item=><SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={pathName===item.url}
            className="min-h-9 rounded-lg text-[13px] data-[active=true]:bg-rose-50 data-[active=true]:font-semibold data-[active=true]:text-rose-800">
            <Link href={item.url as Route} onClick={()=>{if(isMobile)closeMobile();}} className="font-medium">
              {item.icon==='heart'&&<Heart className="size-4 text-pink-600" aria-hidden/>}
              {item.icon==='heart-handshake'&&<HeartHandshake className="size-4 text-pink-600" aria-hidden/>}
              {collapsible&&<ChevronRight size={13} className="shrink-0 text-slate-400" aria-hidden/>}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>)}
      </SidebarMenu>
    </SidebarGroupContent>}
  </SidebarGroup>;
}
export function AppSidebar({
  data,
}: {
  data: {
    collapseGroups?:boolean;
    navMain: {
      title: string;
      url: string;
      items: {
        title: string;
        url: string;
        icon?: string;
      }[];
    }[];
    ProfileTop?: {
      profileImage: string;
      name: string;
      isProfileIncomplete: boolean;
      profileCompletion: number;
      requiredCount?:number;answeredCount?:number;
      biodataStage?: string;
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
                aria-label="আবশ্যিক প্রশ্নের ভিত্তিতে বায়োডাটা সম্পন্ন"
              />
              {typeof data.ProfileTop.requiredCount==='number'&&data.ProfileTop.requiredCount>0&&
                <p className="text-[11px] font-medium text-muted-foreground">
                  আবশ্যিক উত্তর: {data.ProfileTop.answeredCount??0} / {data.ProfileTop.requiredCount}
                </p>}

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
                    {data.ProfileTop.biodataStage === "under_review" ? "বায়োডাটা জমা হয়েছে · পর্যালোচনাধীন" :
                      data.ProfileTop.biodataStage === "published" ? "Published · বায়োডাটা প্রকাশিত" :
                      data.ProfileTop.biodataStage === "deleted" ? "বায়োডাটা সরানো হয়েছে" :
                      data.ProfileTop.biodataStage === "rejected" ? "সংশোধন প্রয়োজন" :
                      data.ProfileTop.biodataStage === "ready" ? "জমা দেওয়ার জন্য প্রস্তুত" : "প্রোফাইল সম্পূর্ণ হয়েছে!"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="md:pt-4">
        {data.navMain.map(group=><GroupNavigation key={group.title}
          group={group} collapsible={!!data.collapseGroups} pathName={pathName}
          isMobile={isMobile} closeMobile={()=>setOpenMobile(false)}/>)}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
