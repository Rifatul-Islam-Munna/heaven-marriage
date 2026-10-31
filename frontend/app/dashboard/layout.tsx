import {privateMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
import DashboardShell from './DashboardShell';
import {getDashboardSession} from '@/lib/dashboard-session';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata(){
  return seoMetadata('/dashboard',{...privateMetadata,title:'Admin Dashboard | Niqaha'});
}
export default async function Layout({children}:{children:React.ReactNode}){
  const session=await getDashboardSession();
  if(!session)redirect('/login');
  if(!session.permissions.length)redirect('/profile');
  return <DashboardShell session={session}>{children}</DashboardShell>;
}
