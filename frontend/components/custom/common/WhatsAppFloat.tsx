// components/WhatsAppFloat.tsx
"use client";

import { MessageCircle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function WhatsAppFloat() {
  const [isHovered, setIsHovered] = useState(false);
  const phoneNumber = "8801748919251"; // Replace with your number
  const message = "আসসালামু আলাইকুম! আমি Niqaha সম্পর্কে জানতে চাই।";

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };
  const pathName = usePathname();

  return (
    <div
      className={cn("fixed bottom-6 right-6 z-50", {
        hidden:
          pathName.startsWith("/dashboard") || pathName.startsWith("/profile"),
      })}
    >
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>

        {/* Main button */}
        <Button
          onClick={handleWhatsAppClick}
          className="relative h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:shadow-green-500/50 transition-all duration-300"
          size="icon"
        >
          <Phone className="h-8 w-8 text-white" fill="white" />
        </Button>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-20 right-0 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap shadow-lg animate-in slide-in-from-bottom-2 duration-200">
            WhatsApp এ যোগাযোগ করুন
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </div>
    </div>
  );
}
