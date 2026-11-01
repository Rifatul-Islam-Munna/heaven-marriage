"use client";

import { Phone } from "lucide-react";
import { FaFacebookMessenger } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { contacts } from "@/lib/contact-config";
import { normalizeMessengerUrl } from "@/lib/messenger-url";

export default function WhatsAppFloat() {
  const path = usePathname();
  const { data } = useQueryWrapper<{ messengerUrl: string }>(
    ["public-settings"],
    "/public/settings",
    { staleTime: 0, refetchOnWindowFocus: true },
  );
  const url = normalizeMessengerUrl(data?.messengerUrl ?? contacts.messenger);
  if (path.startsWith("/dashboard") || path.startsWith("/profile")) return null;

  const onBiodataDetails = path.startsWith("/biodata/");
  const label = url ? "Messenger-এ যোগাযোগ করুন" : "সরাসরি কল করুন";

  return (
    <a
      href={url || "tel:" + contacts.general}
      target={url ? "_blank" : undefined}
      rel={url ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={label}
      className={
        "fixed right-16 z-40 inline-flex h-11 min-w-11 items-center justify-center rounded-full " +
        "border border-white/70 bg-pink-600 px-3 text-white shadow-[0_6px_20px_rgba(190,24,93,0.24)] " +
        "transition-colors hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 " +
        "sm:right-16 sm:h-10 sm:min-w-10 sm:gap-2 sm:px-3.5 " +
        (onBiodataDetails ? "bottom-28 sm:bottom-5" : "bottom-5")
      }
    >
      {url ? (
        <FaFacebookMessenger className="shrink-0 text-[19px] sm:text-[17px]" aria-hidden="true" />
      ) : (
        <Phone className="size-[18px] shrink-0" aria-hidden="true" />
      )}
      <span className="hidden whitespace-nowrap text-xs font-semibold leading-5 sm:inline">
        {url ? "Messenger" : "কল করুন"}
      </span>
    </a>
  );
}
