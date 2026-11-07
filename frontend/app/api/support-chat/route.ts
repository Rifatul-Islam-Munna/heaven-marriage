import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
const COOKIE='niqaha_support_visitor';
const headers={'Cache-Control':'private, no-store, max-age=0'};
const mac=(value:string,secret:string)=>createHmac('sha256',secret).update(value).digest('hex');
function session(cookie:string|undefined,secret:string){
 if(cookie){
   const [id,tag]=cookie.split('.');
   if(/^[A-Za-z0-9_-]{20,80}$/.test(id||'')&&/^[a-f0-9]{64}$/.test(tag||'')&&
     timingSafeEqual(Buffer.from(mac(id,secret),'hex'),Buffer.from(tag,'hex'))){
      return {id,tag,created:false};
   }
 }
 const id=randomBytes(24).toString('base64url');
 return {id,tag:mac(id,secret),created:true};
}
function originAllowed(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{return new URL(origin).host===request.headers.get('host');}catch{return false;}
}
function proxyArgs(request:NextRequest,secret:string){
 const visitor=session(request.cookies.get(COOKIE)?.value,secret);
 // Configure a trusted reverse proxy to strip/replace any inbound IP headers.
 const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||
   request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const ua=(request.headers.get('user-agent')||'unknown').slice(0,180);
 const network=createHash('sha256').update(ip+'|'+ua).digest('hex');
 const stamp=String(Date.now());
 const signature=mac(visitor.id+'\n'+network+'\n'+stamp,secret);
 return {visitor,backendHeaders:{'x-support-visitor':visitor.id,'x-support-network':network,
   'x-support-timestamp':stamp,'x-support-signature':signature}};
}
function withCookie(response:NextResponse,request:NextRequest,visitor:ReturnType<typeof session>){
 if(visitor.created)response.cookies.set(COOKIE,visitor.id+'.'+visitor.tag,{
   httpOnly:true,secure:process.env.NODE_ENV==='production'||request.nextUrl.protocol==='https:',sameSite:'lax',path:'/',maxAge:60*60*24*60,
 });
 return response;
}
function serverConfig(){
 const secret=process.env.SUPPORT_BOT_SECRET?.trim(),base=process.env.BASE_URL?.trim();
 return secret&&secret.length>=32&&base?{secret,base}:null;
}
export async function GET(request:NextRequest){
 const config=serverConfig();
 if(!config)return NextResponse.json({message:'Customer support is not configured. Please use /contact.'},{status:503,headers});
 const {visitor,backendHeaders}=proxyArgs(request,config.secret);
 let response:NextResponse;
 try{
   const upstream=await fetch(config.base.replace(/\/$/,'')+'/support/remaining',{
     method:'GET',headers:backendHeaders,cache:'no-store',signal:AbortSignal.timeout(8000),
   });
   response=NextResponse.json(await upstream.json().catch(()=>({message:'Support unavailable'})),
     {status:upstream.status,headers});
 }catch{
   response=NextResponse.json({message:'Support is temporarily unavailable.'},{status:503,headers});
 }
 return withCookie(response,request,visitor);
}
export async function POST(request:NextRequest){
 if(!originAllowed(request))return NextResponse.json({message:'Invalid origin'},{status:403,headers});
 const config=serverConfig();
 if(!config)return NextResponse.json({message:'Customer support is not configured. Please use /contact.'},{status:503,headers});
 let q:unknown;
 try{
   const raw=await request.text();
   if(raw.length>2000)throw Error();
   const body=JSON.parse(raw);
   q=body&&typeof body==='object'&&!Array.isArray(body)?body.message:null;
 }catch{return NextResponse.json({message:'Invalid question'},{status:400,headers});}
 if(typeof q!=='string'||q.trim().length<3||q.length>600)
   return NextResponse.json({message:'Question must be 3–600 characters'},{status:400,headers});
 const {visitor,backendHeaders}=proxyArgs(request,config.secret);
 let response:NextResponse;
 try{
   const upstream=await fetch(config.base.replace(/\/$/,'')+'/support/chat',{
     method:'POST',headers:{...backendHeaders,'Content-Type':'application/json'},
     body:JSON.stringify({message:q}),cache:'no-store',signal:AbortSignal.timeout(55000),
   });
   response=NextResponse.json(await upstream.json().catch(()=>({message:'Support unavailable'})),
     {status:upstream.status,headers});
 }catch{
   response=NextResponse.json({message:'Support is temporarily unavailable. Please use /contact.'},
     {status:503,headers});
 }
 return withCookie(response,request,visitor);
}
