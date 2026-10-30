"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { contactEvent, pageViewEvent, safePage } from "./google-tag-manager";
export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current !== pathname && safePage(pathname) !== "/private") {
      last.current = pathname;
      pageViewEvent();
    }
  }, [pathname]);
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("tel:")) contactEvent("call");
      else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href))
        contactEvent("whatsapp");
      else if (
        /^https:\/\/(m\.me\/|(?:www\.)?messenger\.com\/t\/|(?:www\.)?facebook\.com\/messages\/t\/)/.test(
          href,
        )
      )
        contactEvent("messenger");
    };
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, []);
  return null;
}
