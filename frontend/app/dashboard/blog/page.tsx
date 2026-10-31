import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import BlogAdminList from '@/components/custom/blog/BlogAdminList';
export const dynamic='force-dynamic';
export default async function AdminBlogsPage(){
  const token=(await cookies()).get('access_token')?.value;
  if(!token)redirect('/login');
  const base=process.env.BASE_URL;
  if(!base)return <p className="p-8">Blog backend is not configured.</p>;
  try{
    const r=await fetch(base.replace(/\/$/,'')+'/blog/admin?page=1',{
      cache:'no-store',headers:{access_token:token},signal:AbortSignal.timeout(10000),
    });
    if(!r.ok)redirect('/dashboard');
  }catch(e){
    if(e&&typeof e==='object'&&'digest'in e)throw e;
    return <p className="p-8">Blog backend is temporarily unavailable.</p>;
  }
  return <BlogAdminList/>;
}
