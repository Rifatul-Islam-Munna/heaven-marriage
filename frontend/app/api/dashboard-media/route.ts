import {cookies} from 'next/headers';
import type {NextRequest} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;

const NO_STORE={'Cache-Control':'private, no-store, max-age=0'};
const MAX_REQUEST_BYTES=81*1024*1024; // 80 MB media + multipart overhead

function validOrigin(request:NextRequest):boolean{
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{
    const source=new URL(origin);
    const hosts=[request.headers.get('host'),request.headers.get('x-forwarded-host'),
      request.nextUrl.host].filter(Boolean);
    return ['https:','http:'].includes(source.protocol)&&hosts.includes(source.host);
  }catch{return false;}
}

export async function POST(request:NextRequest){
  if(!validOrigin(request))
    return Response.json({message:'Invalid upload origin'},{status:403,headers:NO_STORE});

  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Please sign in to upload media'},{status:401,headers:NO_STORE});
  const base=process.env.BASE_URL;
  if(!base)return Response.json({message:'Media storage API is not configured'},{status:503,headers:NO_STORE});
  const type=request.headers.get('content-type')||'';
  if(!/^multipart\/form-data\s*;\s*boundary=/i.test(type)||!request.body)
    return Response.json({message:'Upload a file using multipart form data'},{status:400,headers:NO_STORE});

  const sizeHeader=request.headers.get('content-length');
  const requestBytes=sizeHeader===null?null:Number(sizeHeader);
  if(requestBytes!==null&&Number.isFinite(requestBytes)&&requestBytes>MAX_REQUEST_BYTES)
    return Response.json({message:'Maximum video size is 80 MB (images 25 MB)'},{status:413,headers:NO_STORE});

  try{
    // Stream the original multipart body instead of buffering the entire video in
    // Next.js memory. NestJS/Multer validates the actual format, size and permissions.
    const options:RequestInit&{duplex:'half'}={
      method:'POST',
      cache:'no-store',
      headers:{access_token:token,'content-type':type},
      body:request.body,
      duplex:'half',
      signal:AbortSignal.timeout(115000),
    };
    const response=await fetch(base.replace(/\/$/,'')+'/image/upload-image',options);
    if(!response.ok){
      const detail=await response.json().catch(()=>null);
      const message=typeof detail?.message==='string'?detail.message:
        typeof detail?.message?.message==='string'?detail.message.message:
        response.status===413?'Video exceeds the 80 MB upload limit':
        response.status===403?'This account cannot upload this media':'Media upload failed';
      return Response.json({message},{status:response.status,headers:NO_STORE});
    }
    const url:unknown=await response.json();
    if(typeof url!=='string'||!/^https?:\/\//.test(url))
      return Response.json({message:'Storage returned an invalid URL'},{status:502,headers:NO_STORE});
    return Response.json({url},{headers:NO_STORE});
  }catch{
    return Response.json({message:'Upload failed or timed out. Try a smaller video.'},
      {status:503,headers:NO_STORE});
  }
}

async function webDataRequest(method:'GET'|'PATCH',request:NextRequest){
  if(method==='PATCH'&&!validOrigin(request))
    return Response.json({message:'Invalid request origin'},{status:403,headers:NO_STORE});
  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Please sign in'},{status:401,headers:NO_STORE});
  const base=process.env.BASE_URL;
  if(!base)return Response.json({message:'Website data API is not configured'},{status:503,headers:NO_STORE});

  let body:string|undefined;
  if(method==='PATCH'){
    if(!request.headers.get('content-type')?.startsWith('application/json'))
      return Response.json({message:'Expected a JSON payload'},{status:415,headers:NO_STORE});
    body=await request.text();
    if(!body||body.length>8000)
      return Response.json({message:'Invalid website media update'},{status:400,headers:NO_STORE});
    try{
      const parsed=JSON.parse(body);
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
        throw Error('Invalid');
    }catch{
      return Response.json({message:'Invalid JSON update'},{status:400,headers:NO_STORE});
    }
  }

  try{
    const response=await fetch(base.replace(/\/$/,'')+'/web-data',{
      method,cache:'no-store',
      headers:{access_token:token,...(body?{'content-type':'application/json'}:{})},
      ...(body?{body}:{}),
      signal:AbortSignal.timeout(20000),
    });
    return new Response(await response.text(),{
      status:response.status,
      headers:{...NO_STORE,'Content-Type':'application/json; charset=utf-8'},
    });
  }catch{
    return Response.json({message:'Website data API is unavailable'},{status:503,headers:NO_STORE});
  }
}

export async function GET(request:NextRequest){
  return webDataRequest('GET',request);
}
export async function PATCH(request:NextRequest){
  return webDataRequest('PATCH',request);
}
