import 'server-only';
import {cache} from 'react';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import type {Route} from 'next';
import {
  normalizedDashboardSession,firstDashboardUrl,
  type DashboardSection,type DashboardSession,
} from './dashboard-access';
export const getDashboardSession=cache(async():Promise<DashboardSession|null>=>{
  const token=(await cookies()).get('access_token')?.value;
  if(!token||!process.env.BASE_URL)return null;
  try{
    const response=await fetch(process.env.BASE_URL.replace(/\/$/,'')+'/staff-access/me',{
      headers:{access_token:token},cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    if(!response.ok)return null;
    return normalizedDashboardSession(await response.json());
  }catch{return null;}
});
export async function requireDashboardSection(section:DashboardSection|'roles'){
  const session=await getDashboardSession();
  if(!session)redirect('/login');
  if(section==='roles'){
    if(session.role!=='admin')redirect('/profile');
  }else if(!session.permissions.includes(section)){
    // Fail closed. Do not redirect to the first permitted dashboard route
    // from here: that could hide a failed access check.
    redirect('/profile');
  }
  return session;
}
export async function dashboardLanding(){
  const session=await getDashboardSession();
  if(!session)redirect('/login');
  if(!session.permissions.includes('users'))redirect(firstDashboardUrl(session) as Route);
  return session;
}
