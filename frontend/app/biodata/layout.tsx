import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
export const dynamic='force-dynamic';
const defaultMetadata=publicMetadata("বায়োডাটা খুঁজুন | Niqaha.com","পছন্দ অনুযায়ী অনুমোদিত পাত্র-পাত্রীর বায়োডাটা খুঁজুন।",'/biodata');
export async function generateMetadata(){return seoMetadata('/biodata',defaultMetadata);}
export default function Layout({children}:{children:React.ReactNode}){
  return <>{children}<SeoStructuredData path="/biodata"/></>;
}
