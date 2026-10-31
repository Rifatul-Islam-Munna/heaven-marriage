import {requireDashboardSection} from '@/lib/dashboard-session';
import {privateMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
export const dynamic='force-dynamic';
export async function generateMetadata(){return seoMetadata("/dashboard/visual-editor",{...privateMetadata,title:"visual editor | Niqaha"});}
export default async function Layout({children}:{children:React.ReactNode}){await requireDashboardSection('visual-editor');return children;}
