import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import QuestionBuilder from '@/components/custom/dashboard/QuestionBuilder';
export const dynamic='force-dynamic';
export default async function QuestionBuilderPage(){
 const token=(await cookies()).get('access_token')?.value;
 if(!token)redirect('/login');
 if(!process.env.BASE_URL)return <p className="p-6">Backend is not configured.</p>;
 try{
  const response=await fetch(process.env.BASE_URL.replace(/\/$/,'')+'/profile-questions/admin',{
   cache:'no-store',headers:{access_token:token},signal:AbortSignal.timeout(10000),
  });
  if(!response.ok)redirect('/dashboard');
 }catch(error){
  if(typeof error==='object'&&error!==null&&'digest'in error)throw error;
  return <p className="p-6">Question builder backend is unreachable.</p>;
 }
 return <QuestionBuilder/>;
}
