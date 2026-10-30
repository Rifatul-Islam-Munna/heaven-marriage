import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
  "আমাদের সম্পর্কে | Niqaha.com",
  "Niqaha.com ইসলামিক ম্যাট্রিমনি সেবার উদ্দেশ্য ও কার্যক্রম সম্পর্কে জানুন।",
  "/about",
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
