import {privateMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
export const dynamic='force-dynamic';
export async function generateMetadata(){return seoMetadata("/payment/successfull",{...privateMetadata,title:"successfull | Niqaha"});}
export default function Layout({children}:{children:React.ReactNode}){return children;}
