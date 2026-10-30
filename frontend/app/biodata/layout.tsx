import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
  "বায়োডাটা খুঁজুন | Niqaha.com",
  "পছন্দ অনুযায়ী অনুমোদিত পাত্র-পাত্রীর বায়োডাটা খুঁজুন।",
  "/biodata",
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
