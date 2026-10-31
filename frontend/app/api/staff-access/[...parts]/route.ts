import {cookies} from 'next/headers';
import type {NextRequest} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store, max-age=0'};
type Context={params:Promise<{parts:string[]}>};
async function proxy(req:NextRequest,context:Context,method:'GET'|'PATCH'){
  const parts=(await context.params).parts||[];
  const route=parts.join('/');
  const allowed=method==='GET'?
    ['me','admin/catalog','admin/staff','admin/search'].includes(route):
    /^admin\/[0-9a-f]{24}$/i.test(route);
  if(!allowed)return Response.json({message:'Unknown staff route'},{status:404,headers:noStore});
  if(method==='PATCH'){
    const origin=req.headers.get('origin');
    if(origin){
      try{if(new URL(origin).host!==req.headers.get('host'))throw Error();}
      catch{return Response.json({message:'Invalid origin'},{status:403,headers:noStore});}
    }
  }
  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Sign in first'},{status:401,headers:noStore});
  if(!process.env.BASE_URL)return Response.json({message:'Staff backend unavailable'},{status:503,headers:noStore});
  let body:string|undefined;
  if(method==='PATCH'){
    body=await req.text();
    if(body.length>2000)return Response.json({message:'Request too large'},{status:413,headers:noStore});
    try{JSON.parse(body);}catch{return Response.json({message:'Invalid JSON'},{status:400,headers:noStore});}
  }
  const query=route==='admin/search'?'?q='+encodeURIComponent(req.nextUrl.searchParams.get('q')||''):'';
  try{
    const r=await fetch(process.env.BASE_URL.replace(/\/$/,'')+'/staff-access/'+route+query,{
      method,cache:'no-store',headers:{access_token:token,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body}:{}),signal:AbortSignal.timeout(12000),
    });
    return new Response(await r.text(),{status:r.status,
      headers:{...noStore,'Content-Type':'application/json; charset=utf-8'}});
  }catch{return Response.json({message:'Staff backend temporarily unavailable'},{status:503,headers:noStore});}
}
export async function GET(req:NextRequest,ctx:Context){return proxy(req,ctx,'GET');}
export async function PATCH(req:NextRequest,ctx:Context){return proxy(req,ctx,'PATCH');}
