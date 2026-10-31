import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import { defaultQuestions } from '@/lib/profile-questions';

const TAG='profile-question-config-v1';
const TTL=20*60;
const noStore={ 'Cache-Control':'private, no-store, max-age=0' };
export const runtime='nodejs';
export const dynamic='force-dynamic';

const cachedQuestions=unstable_cache(async (base:string)=>{
 if(!base)throw new Error('Backend missing');
 const result=await fetch(base.replace(/\/$/,'')+'/profile-questions',{
  cache:'no-store',signal:AbortSignal.timeout(10000),
 });
 if(!result.ok)throw new Error('Questions unavailable');
 return result.json();
},['profile-question-catalog-v1'],{revalidate:TTL,tags:[TAG]});

function originAllowed(req:NextRequest){
 const origin=req.headers.get('origin');
 if(!origin)return true;
 try{
  const url=new URL(origin);
  return ['http:','https:'].includes(url.protocol)&&url.host===req.headers.get('host');
 }catch{return false;}
}
async function adminBackend(method:'GET'|'PUT',body?:string){
 const token=(await cookies()).get('access_token')?.value;
 if(!token)return Response.json({message:'Login required'},{status:401,headers:noStore});
 const base=process.env.BASE_URL;
 if(!base)return Response.json({message:'Backend not configured'},{status:503,headers:noStore});
 try{
  const r=await fetch(base.replace(/\/$/,'')+'/profile-questions/admin',{
   method,cache:'no-store',
   headers:{access_token:token,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body}:{}),signal:AbortSignal.timeout(15000),
  });
  return new Response(await r.text(),{status:r.status,
   headers:{...noStore,'Content-Type':'application/json; charset=utf-8'}});
 }catch{return Response.json({message:'Backend unreachable'},{status:503,headers:noStore});}
}
export async function GET(req:NextRequest){
 if(req.nextUrl.searchParams.has('admin'))return adminBackend('GET');
 try{
  const questions=await cachedQuestions(process.env.BASE_URL||'');
  return Response.json(questions,{headers:noStore});
 }catch{return Response.json(defaultQuestions,{headers:noStore});}
}
export async function PUT(req:NextRequest){
 if(!originAllowed(req))return Response.json({message:'Invalid origin'},{status:403,headers:noStore});
 let text:string;
 try{
  text=await req.text();
  if(text.length>320000)throw Error();
  const parsed=JSON.parse(text);
  if(!parsed||!Array.isArray(parsed.questions))throw Error();
 }catch{return Response.json({message:'Invalid question schema'},{status:400,headers:noStore});}
 const result=await adminBackend('PUT',text);
 if(result.ok)revalidateTag(TAG,{expire:0});
 return result;
}
