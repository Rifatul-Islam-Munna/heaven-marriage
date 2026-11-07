"use client";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { cn } from "@/lib/utils";
export default function PolicyLinks({
  className, linkClassName,
}: { className?: string; linkClassName?: string } = {}) {
  const { data } = useQueryWrapper<{ policies: Record<string, boolean> }>(
    ["public-settings"],
    "/public/settings",
  );
  const flags = { terms: true, refund: true, ...(data?.policies || {}) };
  return (
    <span className={cn("flex flex-wrap gap-3 text-xs", className)}>
      {Object.entries(flags)
        .filter(([, enabled]) => enabled)
        .map(([kind]) => (
          <a
            className={cn("underline text-pink-600 underline-offset-4", linkClassName)}
            key={kind}
            href={"/policies/" + kind}
          >
            {kind === "terms"
              ? "Terms & Conditions"
              : kind === "privacy"
                ? "Privacy Policy"
                : "Refund & Cancellation Policy"}
          </a>
        ))}
    </span>
  );
}
