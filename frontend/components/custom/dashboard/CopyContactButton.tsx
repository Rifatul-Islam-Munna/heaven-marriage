"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { GetRequestNormal } from "@/api-hooks/api-hooks";
import { copyBiodataWhatsappText } from "@/lib/biodata-whatsapp-share";
import type { User } from "@/@types/user";
import { toast } from "sonner";
export default function CopyContactButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={busy}
      title="Copy short biodata with contact numbers"
      aria-label="Copy short biodata with contact numbers"
      onClick={async () => {
        setBusy(true);
        try {
          const u = await GetRequestNormal<User>(
            "/user/get-user-profile-admin?id=" + encodeURIComponent(id),
          );
          const { copied } = await copyBiodataWhatsappText(
            u,
            window.location.origin,
            { includeContactNumber: true },
          );
          if (copied) toast.success("Short biodata and contact numbers copied");
          else toast.error("Clipboard unavailable");
        } catch {
          toast.error("Unable to copy");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Copy />
      <span className="sr-only">With contact numbers</span>
    </Button>
  );
}
