import { notFound } from "next/navigation";
import { publicMetadata } from "@/lib/seo";
import supplied from "@/content/policies.json";
import PolicyDocument, {
  type PolicyContent,
} from "@/components/custom/common/PolicyDocument";
const names: Record<string, string> = {
  terms: "Terms & Conditions, Membership Rules & Service Policy",
  privacy: "Privacy Policy",
  refund: "Refund & Cancellation Policy",
};
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  return publicMetadata(
    (names[kind] || "Policy") + " | Niqaha.com",
    "Niqaha.com " + (names[kind] || "service policy"),
    "/policies/" + kind,
  );
}
export default async function Policy({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!["terms", "privacy", "refund"].includes(kind)) notFound();
  let policy: PolicyContent | undefined =
    kind === "terms" || kind === "refund"
      ? { ...supplied[kind], sourceHash: supplied[kind].sha256 }
      : undefined;
  let hidden = false;
  if (process.env.BASE_URL)
    try {
      const response = await fetch(
        process.env.BASE_URL + "/public/policy/" + kind,
        { cache: "no-store", signal: AbortSignal.timeout(5000) },
      );
      const data = await response.json();
      if (response.ok && typeof data.text === "string") policy = data;
      else if (data.policyHidden || data.message?.policyHidden) hidden = true;
    } catch {
      /* Approved bundled documents remain available if the API is unavailable. */
    }
  if (hidden || !policy) notFound();
  return <PolicyDocument kind={kind} policy={policy} />;
}
