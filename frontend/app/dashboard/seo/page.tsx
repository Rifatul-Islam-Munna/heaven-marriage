import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import SeoManager from '@/components/custom/dashboard/SeoManager';
export const dynamic='force-dynamic';
export default async function SeoManagerPage(){
  const token=(await cookies()).get('access_token')?.value;
  if(!token)redirect('/login');
  const base=process.env.BASE_URL;
  if(!base)return <p className="p-6">SEO backend is not configured.</p>;
  try{
    const response=await fetch(base.replace(/\/$/,'')+'/seo-settings/admin?path=%2F',{
      cache:'no-store',headers:{access_token:token},signal:AbortSignal.timeout(10000),
    });
    if(!response.ok)redirect('/dashboard');
  }catch(error){
    if(error&&typeof error==='object'&&'digest'in error)throw error;
    return <p className="p-6">SEO backend is currently unavailable.</p>;
  }
  return <SeoManager/>;
}
