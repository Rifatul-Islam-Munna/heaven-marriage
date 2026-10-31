import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
export const dynamic='force-dynamic';
const defaultMetadata=publicMetadata("আমাদের সম্পর্কে | Niqaha.com","Niqaha.com ইসলামিক ম্যাট্রিমনি সেবার উদ্দেশ্য ও কার্যক্রম সম্পর্কে জানুন।",'/about');
export async function generateMetadata(){return seoMetadata('/about',defaultMetadata);}
export default function Layout({children}:{children:React.ReactNode}){
  return <>{children}<SeoStructuredData path="/about"/></>;
}
