import {cookies} from 'next/headers';
import {revalidatePath,revalidateTag} from 'next/cache';
import type {NextRequest} from 'next/server';
import {BLOG_CACHE_TAG} from '@/lib/blog-server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store, max-age=0'};
type Context={params:Promise<{segments?:string[]}>};
function validParts(parts:string[]){
  return parts.length===0||(parts.length===1&&/^[a-f0-9]{24}$/i.test(parts[0]))||
    (parts.length===2&&/^[a-f0-9]{24}$/i.test(parts[0])&&
      ['publish','unpublish','restore'].includes(parts[1]));
}
function allowedOrigin(req:NextRequest){
  const origin=req.headers.get('origin');
  if(!origin)return true;
  try{const u=new URL(origin);return u.host===req.headers.get('host')&&
    ['http:','https:'].includes(u.protocol);}catch{return false;}
}
async function proxy(req:NextRequest,context:Context,method:'GET'|'POST'|'PATCH'|'DELETE'){
  const parts=(await context.params).segments||[];
  if(!validParts(parts))return Response.json({message:'Unknown article action'},{status:400,headers:noStore});
  if(method!=='GET'&&!allowedOrigin(req))
    return Response.json({message:'Invalid request origin'},{status:403,headers:noStore});
  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Admin login required'},{status:401,headers:noStore});
  const base=process.env.BASE_URL;
  if(!base)return Response.json({message:'Blog backend unavailable'},{status:503,headers:noStore});
  let body:string|undefined;
  if(method!=='GET'){
    body=await req.text();
    if(body.length>350000)return Response.json({message:'Article too large'},{status:413,headers:noStore});
    if(body){
      try{const json=JSON.parse(body);if(!json||typeof json!=='object'||Array.isArray(json))throw Error();}
      catch{return Response.json({message:'Invalid blog JSON'},{status:400,headers:noStore});}
    }
  }
  const query=req.nextUrl.search;
  const endpoint='/blog/admin'+(parts.length?'/'+parts.map(encodeURIComponent).join('/'):'')+
    (method==='GET'&&query?query:'');
  try{
    const response=await fetch(base.replace(/\/$/,'')+endpoint,{
      method,cache:'no-store',headers:{access_token:token,
        ...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body}:{}),signal:AbortSignal.timeout(18000),
    });
    const raw=await response.text();
    if(response.ok&&
      (method==='DELETE'||parts[1]==='publish'||parts[1]==='unpublish')){
      revalidateTag(BLOG_CACHE_TAG,{expire:0});
      revalidatePath('/blog');
      revalidatePath('/blog/[slug]','page');
      revalidatePath('/blog/feed.xml');
      revalidatePath('/sitemap.xml');
    }
    return new Response(raw,{status:response.status,
      headers:{...noStore,'Content-Type':'application/json; charset=utf-8'}});
  }catch{
    return Response.json({message:'Blog backend temporarily unavailable'},{status:503,headers:noStore});
  }
}
export async function GET(req:NextRequest,ctx:Context){return proxy(req,ctx,'GET');}
export async function POST(req:NextRequest,ctx:Context){return proxy(req,ctx,'POST');}
export async function PATCH(req:NextRequest,ctx:Context){return proxy(req,ctx,'PATCH');}
export async function DELETE(req:NextRequest,ctx:Context){return proxy(req,ctx,'DELETE');}
