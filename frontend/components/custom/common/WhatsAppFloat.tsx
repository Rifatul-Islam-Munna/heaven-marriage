"use client";
import { Phone } from "lucide-react";
import { FaFacebookMessenger } from "react-icons/fa";
import { Button } from "@/components/ui/button";
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
  const label = url ? "Messenger-এ যোগাযোগ করুন" : "সরাসরি কল করুন";
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        asChild
        className="h-14 rounded-full bg-pink-600 px-4 text-white shadow-xl hover:bg-pink-700"
      >
        <a
          href={url || "tel:" + contacts.general}
          target={url ? "_blank" : undefined}
          rel="noopener noreferrer"
          aria-label={url ? "Niqaha.com Messenger" : "Call Niqaha.com"}
          title={label}
        >
          {url ? (
            <FaFacebookMessenger aria-hidden="true" />
          ) : (
            <Phone aria-hidden="true" />
          )}
          <span className="text-sm font-semibold">{label}</span>
        </a>
      </Button>
    </div>
  );
}
