import {cookies} from 'next/headers';
import type {NextRequest} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;

const NO_STORE={'Cache-Control':'private, no-store, max-age=0'};

function validOrigin(request:NextRequest):boolean{
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{
    const source=new URL(origin);
    const hosts=[request.headers.get('host'),request.headers.get('x-forwarded-host'),
      request.nextUrl.host].filter(Boolean);
    return (source.protocol==='https:'||source.protocol==='http:')&&hosts.includes(source.host);
  }catch{return false;}
}

async function forward(method:'GET'|'PATCH'|'POST',endpoint:string,body?:string){
  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Please sign in as an authorized administrator'},
    {status:401,headers:NO_STORE});
  const base=process.env.BASE_URL;
  if(!base)return Response.json({message:'Media backend is not configured'},
    {status:503,headers:NO_STORE});
  try{
    const response=await fetch(base.replace(/\/$/,'')+endpoint,{
      method,cache:'no-store',
      headers:{access_token:token,...(body?{'content-type':'application/json'}:{})},
      ...(body?{body}:{}),
      signal:AbortSignal.timeout(endpoint.includes('complete-upload')?150000:25000),
    });
    return new Response(await response.text(),{
      status:response.status,
      headers:{...NO_STORE,'Content-Type':'application/json; charset=utf-8'},
    });
  }catch(error){
    console.error('[dashboard-media] backend unavailable',{
      endpoint:method==='GET'?'read':endpoint.includes('presign')?'presign':endpoint.includes('complete')?'complete':'save',
      error:error instanceof Error?error.name:'unknown',
    });
    return Response.json({message:'Media backend is unavailable; check the backend deployment'},
      {status:503,headers:NO_STORE});
  }
}

async function parseBody(request:NextRequest,maxLength:number){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return null;
  const length=request.headers.get('content-length');
  if(length&&Number(length)>maxLength)return null;
  const raw=await request.text();
  if(!raw||raw.length>maxLength)return null;
  try{
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?raw:null;
  }catch{return null;}
}

export async function POST(request:NextRequest){
  if(!validOrigin(request))return Response.json({message:'Invalid request origin'},
    {status:403,headers:NO_STORE});
  const action=request.nextUrl.searchParams.get('action');
  if(action!=='presign'&&action!=='complete')
    return Response.json({message:'Use a presigned direct RustFS upload'},
      {status:400,headers:NO_STORE});
  // No media bytes are ever received by Next.js. Sign and confirm only.
  const body=await parseBody(request,2048);
  if(!body)return Response.json({message:'Invalid media upload request'},
    {status:400,headers:NO_STORE});
  return forward('POST',action==='presign'?'/image/presign-upload':'/image/complete-upload',body);
}

export async function GET(){
  return forward('GET','/web-data');
}

export async function PATCH(request:NextRequest){
  if(!validOrigin(request))return Response.json({message:'Invalid request origin'},
    {status:403,headers:NO_STORE});
  const body=await parseBody(request,8000);
  if(!body)return Response.json({message:'Invalid website media update'},
    {status:400,headers:NO_STORE});
  return forward('PATCH','/web-data',body);
}
