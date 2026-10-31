import {privateMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
import ProfileShell from './ProfileShell';
export const dynamic='force-dynamic';
export async function generateMetadata(){
  return seoMetadata('/profile',{...privateMetadata,title:'My Profile | Niqaha'});
}
export default function Layout({children}:{children:React.ReactNode}){
  return <ProfileShell>{children}</ProfileShell>;
}
