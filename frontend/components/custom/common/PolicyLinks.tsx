"use client";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
export default function PolicyLinks() {
  const { data } = useQueryWrapper<{ policies: Record<string, boolean> }>(
    ["public-settings"],
    "/public/settings",
  );
  const flags = { terms: true, refund: true, ...(data?.policies || {}) };
  return (
    <span className="flex flex-wrap gap-3 text-xs">
      {Object.entries(flags)
        .filter(([, enabled]) => enabled)
        .map(([kind]) => (
          <a
            className="underline text-pink-600"
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
