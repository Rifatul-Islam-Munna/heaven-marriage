import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
export const dynamic='force-dynamic';
const defaultMetadata=publicMetadata("সাধারণ জিজ্ঞাসা | Niqaha.com","বায়োডাটা তৈরি ও সংযোগ সম্পর্কে সাধারণ প্রশ্নের উত্তর।",'/faq');
export async function generateMetadata(){return seoMetadata('/faq',defaultMetadata);}
export default function Layout({children}:{children:React.ReactNode}){
  return <>{children}<SeoStructuredData path="/faq"/></>;
}
