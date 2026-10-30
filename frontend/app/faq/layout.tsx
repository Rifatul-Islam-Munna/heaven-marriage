import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
  "সাধারণ জিজ্ঞাসা | Niqaha.com",
  "বায়োডাটা তৈরি ও সংযোগ সম্পর্কে সাধারণ প্রশ্নের উত্তর।",
  "/faq",
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
