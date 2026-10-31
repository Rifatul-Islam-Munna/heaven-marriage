import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
export const dynamic='force-dynamic';
const defaultMetadata=publicMetadata("কানেকশন প্যাকেজ | Niqaha.com","Niqaha.com-এর কানেকশন প্যাকেজের মূল্য ও সুবিধা দেখুন।",'/pricing');
export async function generateMetadata(){return seoMetadata('/pricing',defaultMetadata);}
export default function Layout({children}:{children:React.ReactNode}){
  return <>{children}<SeoStructuredData path="/pricing"/></>;
}
