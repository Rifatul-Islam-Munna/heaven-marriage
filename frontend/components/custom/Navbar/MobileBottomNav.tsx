"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { BookOpenText, House, Search, UserRound } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { cn } from "@/lib/utils";

/**
 * Persistent public-site mobile/tablet navigation.  Desktop stays unchanged.
 * The spacer prevents the fixed bar from covering the footer or last button.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const hidden = pathname.startsWith("/dashboard");

  if (hidden) return null;

  // During session hydration, avoid flashing a "Login" destination for members.
  const accountHref = loading ? "/profile" : !user ? "/login" :
    ["admin", "manager", "seo", "blog", "editor"].includes(user.role || "")
      ? "/dashboard" : "/profile";

  const items = [
    { href: "/", label: "হোম", icon: House, active: pathname === "/" },
    { href: "/biodata", label: "ম্যাচ খুঁজুন", icon: Search,
      active: pathname === "/biodata" || pathname.startsWith("/biodata/") },
    { href: "/blog", label: "ব্লগ", icon: BookOpenText,
      active: pathname === "/blog" || pathname.startsWith("/blog/") },
    { href: accountHref, label: "একাউন্ট", icon: UserRound,
      active: pathname.startsWith("/profile") || pathname.startsWith("/login") ||
        pathname.startsWith("/signup") },
  ];

  return (
    <>
      <nav data-visual-global="true" aria-label="মোবাইলের প্রধান নেভিগেশন"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-pink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-7px_30px_rgba(78,26,49,0.10)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[68px] w-full min-w-0 max-w-2xl grid-cols-4 items-stretch px-1 sm:px-4">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Link key={label} href={href as Route} aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-pink-600 sm:text-xs",
                active ? "text-pink-700" : "text-gray-500 hover:text-pink-700",
              )}>
              <span className={cn(
                "flex h-8 min-w-12 items-center justify-center rounded-full transition-colors",
                active ? "bg-pink-100" : "group-hover:bg-pink-50",
              )}>
                <Icon className="size-[21px]" aria-hidden strokeWidth={active ? 2.3 : 1.9} />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <div aria-hidden="true" className="h-[calc(68px+env(safe-area-inset-bottom))] lg:hidden" />
    </>
  );
}
