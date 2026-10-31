import {cookies} from 'next/headers';
import {revalidatePath,revalidateTag} from 'next/cache';
import type {NextRequest} from 'next/server';
import {getPublishedSeo,SEO_CACHE_TAG} from '@/lib/seo-settings-server';
import {validSeoPath} from '@/lib/seo-settings-types';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store, max-age=0'};
function originAllowed(req:NextRequest){
  const origin=req.headers.get('origin');
  if(!origin)return true;
  try{
    const u=new URL(origin);
    return ['https:','http:'].includes(u.protocol)&&u.host===req.headers.get('host');
  }catch{return false;}
}
async function forward(method:'GET'|'PUT'|'POST',route:string,body?:string){
  const base=process.env.BASE_URL;
  if(!base)return Response.json({message:'SEO backend not configured'},{status:503,headers:noStore});
  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Administrator login required'},{status:401,headers:noStore});
  try{
    const r=await fetch(base.replace(/\/$/,'')+route,{
      method,cache:'no-store',
      headers:{access_token:token,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body}:{}),signal:AbortSignal.timeout(12000),
    });
    return new Response(await r.text(),{status:r.status,
      headers:{...noStore,'Content-Type':'application/json; charset=utf-8'}});
  }catch{return Response.json({message:'SEO backend unreachable'},{status:503,headers:noStore});}
}
export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  if(params.has('list'))return forward('GET','/seo-settings/admin/list');
  const path=params.get('path')||'/';
  if(!validSeoPath(path))return Response.json({message:'Invalid SEO path'},{status:400,headers:noStore});
  if(params.has('admin'))return forward('GET','/seo-settings/admin?path='+encodeURIComponent(path));
  const template=params.get('template')||'';
  if(template&&!validSeoPath(template))
    return Response.json({message:'Invalid route template'},{status:400,headers:noStore});
  const result=await getPublishedSeo(path,template||undefined);
  return Response.json(result,{headers:noStore});
}
async function write(request:NextRequest,method:'PUT'|'POST',endpoint:string){
  if(!originAllowed(request))return Response.json({message:'Invalid request origin'},{status:403,headers:noStore});
  let raw:string,body:{scope:string;revision:number;settings?:unknown};
  try{
    raw=await request.text();
    if(raw.length>40000)throw Error();
    body=JSON.parse(raw);
    if(!body||typeof body!=='object'||!validSeoPath(body.scope))throw Error();
  }catch{return Response.json({message:'Invalid SEO request'},{status:400,headers:noStore});}
  const r=await forward(method,endpoint,raw);
  if(r.ok&&method==='POST'){
    revalidateTag(SEO_CACHE_TAG,{expire:0});
    // Dynamic route output and the sitemap must be refreshed on publish.
    revalidatePath('/sitemap.xml');
    if(body.scope!=='@site'){
      try{revalidatePath(body.scope,'page');}catch{/* template URLs are not direct page paths */}
    }else revalidatePath('/','layout');
  }
  return r;
}
export async function PUT(request:NextRequest){return write(request,'PUT','/seo-settings/admin');}
export async function POST(request:NextRequest){return write(request,'POST','/seo-settings/admin/publish');}
