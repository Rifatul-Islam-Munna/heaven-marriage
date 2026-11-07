import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/dashboard-session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");
  if (session.role !== "user") redirect("/dashboard");
  return children;
}
