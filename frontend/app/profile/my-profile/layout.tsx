import {privateMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
export const dynamic='force-dynamic';
export async function generateMetadata(){return seoMetadata("/profile/my-profile",{...privateMetadata,title:"my profile | Niqaha"});}
export default function Layout({children}:{children:React.ReactNode}){return children;}
