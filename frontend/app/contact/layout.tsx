import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
  "যোগাযোগ | Niqaha.com",
  "Niqaha.com-এর সহায়তা, ফোন নম্বর, অফিসের ঠিকানা ও সময়সূচি।",
  "/contact",
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
