import {requireDashboardSection} from '@/lib/dashboard-session';
import {privateMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
export const dynamic='force-dynamic';
export async function generateMetadata(){return seoMetadata("/dashboard/edit-profile/[id]",{...privateMetadata,title:"[id] | Niqaha"});}
export default async function Layout({children}:{children:React.ReactNode}){await requireDashboardSection('users');return children;}
