import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
  "ব্যবহারের নির্দেশনা | Niqaha.com",
  "বায়োডাটা জমা ও নিরাপদে জীবনসঙ্গী খোঁজার নির্দেশনা।",
  "/guidelines",
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
