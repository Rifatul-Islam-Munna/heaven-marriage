import { publicMetadata } from '@/lib/seo';
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
export const dynamic='force-dynamic';
const defaultMetadata=publicMetadata("ব্যবহারের নির্দেশনা | Niqaha.com","বায়োডাটা জমা ও নিরাপদে জীবনসঙ্গী খোঁজার নির্দেশনা।",'/guidelines');
export async function generateMetadata(){return seoMetadata('/guidelines',defaultMetadata);}
export default function Layout({children}:{children:React.ReactNode}){
  return <>{children}<SeoStructuredData path="/guidelines"/></>;
}
