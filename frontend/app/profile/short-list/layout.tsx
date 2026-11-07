import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/dashboard-session";
import { privateMetadata } from "@/lib/seo";
import { seoMetadata } from "@/lib/seo-settings-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return seoMetadata("/profile/short-list", { ...privateMetadata, title: "My Favourites | Niqaha" });
}
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");
  if (session.role !== "user") redirect("/dashboard");
  return children;
}
