import {cookies} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import BlogAdminEditor from '@/components/custom/blog/BlogAdminEditor';
import type {BlogAdminDoc} from '@/lib/blog-types';
import {getDashboardSession} from '@/lib/dashboard-session';
export const dynamic='force-dynamic';
export default async function BlogEditorPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[a-f0-9]{24}$/i.test(id))notFound();
  const token=(await cookies()).get('access_token')?.value;
  if(!token)redirect('/login');
  const base=process.env.BASE_URL;
  if(!base)return <p className="p-8">Blog backend is not configured.</p>;
  try{
    const r=await fetch(base.replace(/\/$/,'')+'/blog/admin/'+encodeURIComponent(id),{
      cache:'no-store',headers:{access_token:token},signal:AbortSignal.timeout(10000),
    });
    if(r.status===404)notFound();
    if(!r.ok)redirect('/dashboard');
    const blog=await r.json() as BlogAdminDoc;
    const session=await getDashboardSession();
    return <BlogAdminEditor key={blog.id} initial={blog} canEditSeo={session?.permissions.includes('seo')||false}/>;
  }catch(e){
    if(e&&typeof e==='object'&&'digest'in e)throw e;
    return <p className="p-8">Unable to load the article. Try again after the backend reconnects.</p>;
  }
}
