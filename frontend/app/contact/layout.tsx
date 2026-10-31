import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
export const dynamic='force-dynamic';
const defaultMetadata=publicMetadata("যোগাযোগ | Niqaha.com","Niqaha.com-এর সহায়তা, ফোন নম্বর, অফিসের ঠিকানা ও সময়সূচি।",'/contact');
export async function generateMetadata(){return seoMetadata('/contact',defaultMetadata);}
export default function Layout({children}:{children:React.ReactNode}){
  return <>{children}<SeoStructuredData path="/contact"/></>;
}
