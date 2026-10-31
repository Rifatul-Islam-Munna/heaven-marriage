import {privateMetadata} from '@/lib/seo';
import {requireDashboardSection} from '@/lib/dashboard-session';
export const metadata={...privateMetadata,title:'Staff roles & access | Niqaha'};
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){
  await requireDashboardSection('roles');
  return children;
}
