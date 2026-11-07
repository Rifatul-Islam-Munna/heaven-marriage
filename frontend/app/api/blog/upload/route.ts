import {cookies} from 'next/headers';
import type {NextRequest} from 'next/server';
import sharp from 'sharp';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
const noStore={'Cache-Control':'private, no-store, max-age=0'};
export const MAX_BLOG_IMAGE_BYTES=12*1024*1024;
export const MAX_BLOG_VIDEO_BYTES=50*1024*1024;
const imageMimes=['image/jpeg','image/png','image/webp','image/avif'];

function validImageSignature(bytes:Uint8Array,type:string){
 const match=(arr:number[],offset=0)=>arr.every((n,i)=>bytes[i+offset]===n);
 const ascii=(offset:number,length:number)=>String.fromCharCode(...bytes.slice(offset,offset+length));
 if(type==='image/png')return match([137,80,78,71,13,10,26,10]);
 if(type==='image/jpeg')return match([255,216,255]);
 if(type==='image/webp')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
 if(type==='image/avif')return ascii(4,4)==='ftyp'&&['avif','avis'].includes(ascii(8,4));
 return false;
}
export function validVideoSignature(bytes:Uint8Array,type:string){
 const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
 if(type==='video/mp4')return bytes.length>=12&&ascii(4,8)==='ftyp'&&
   /^(isom|iso2|iso3|iso4|iso5|iso6|mp41|mp42|avc1|M4V |dash)$/.test(ascii(8,12));
 if(type==='video/webm')return [0x1a,0x45,0xdf,0xa3].every((n,i)=>bytes[i]===n)
   &&ascii(0,bytes.length).includes('webm');
 return false;
}
function safePublicUrl(raw:unknown){
 if(typeof raw!=='string'||raw.length>2048)return null;
 if(raw.startsWith('/')&&!raw.startsWith('//'))return raw;
 try{const url=new URL(raw);
   if(url.protocol==='https:'&&!url.username&&!url.password)return url.toString();
   if(process.env.NODE_ENV!=='production'&&url.protocol==='http:'&&
       ['localhost','127.0.0.1'].includes(url.hostname))return url.toString();
 }catch{}
 return null;
}
function upstreamUrl(responseText:string):string|null{
 let data:unknown=responseText.trim();
 try{data=JSON.parse(responseText);}catch{}
 const raw=typeof data==='string'?data:data&&typeof data==='object'?
   ((data as Record<string,unknown>).url||(data as Record<string,unknown>).data):null;
 return safePublicUrl(raw);
}
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin){
   try{if(new URL(origin).host!==req.headers.get('host'))
     return Response.json({message:'Invalid origin'},{status:403,headers:noStore});}
   catch{return Response.json({message:'Invalid origin'},{status:403,headers:noStore});}
 }
 const requestBytes=Number(req.headers.get('content-length'));
 if(Number.isFinite(requestBytes)&&requestBytes>MAX_BLOG_VIDEO_BYTES+1024*1024)
   return Response.json({message:'Maximum Blog media upload is 50 MB'},{status:413,headers:noStore});
 const token=(await cookies()).get('access_token')?.value;
 if(!token)return Response.json({message:'Admin login required'},{status:401,headers:noStore});
 const base=process.env.BASE_URL;
 if(!base)return Response.json({message:'Blog media storage is not configured'},{status:503,headers:noStore});
 try{
   const form=await req.formData();
   const original=form.get('file');
   if(!(original instanceof File)||original.size<1)
     return Response.json({message:'Choose an image or video'},{status:400,headers:noStore});
   const video=original.type==='video/mp4'||original.type==='video/webm';
   const image=imageMimes.includes(original.type);
   if(!video&&!image)return Response.json({message:'Only JPEG, PNG, WebP, AVIF, MP4 and WebM are supported'},{status:400,headers:noStore});
   if(original.size>(video?MAX_BLOG_VIDEO_BYTES:MAX_BLOG_IMAGE_BYTES))
     return Response.json({message:video?'Video must be 50 MB or smaller':'Image must be 12 MB or smaller'},{status:413,headers:noStore});
   const signature=new Uint8Array(await original.slice(0,1024).arrayBuffer());
   if(!(video?validVideoSignature(signature,original.type):validImageSignature(signature,original.type)))
     return Response.json({message:'File content does not match its image/video type'},{status:400,headers:noStore});

   let media:File|Blob=original;
   let storedBytes=original.size,optimized=false,filename='';
   let endpoint='/blog/admin/media/video';
   if(video){
     filename='blog-video.'+(original.type==='video/webm'?'webm':'mp4');
   }else{
     endpoint='/image/upload-image';
     const originalBytes=Buffer.from(await original.arrayBuffer());
     let processed:Buffer;
     try{
       const input=sharp(originalBytes,{limitInputPixels:40_000_000,failOn:'error'});
       const metadata=await input.metadata();
       if(!metadata.width||!metadata.height)throw Error('Invalid image dimensions');
       const resize=Math.max(metadata.width,metadata.height)>1800;
       if(resize||original.size>600*1024){
         processed=await input.rotate().resize(1800,1800,{
           fit:'inside',withoutEnlargement:true,
         }).webp({quality:80,effort:4}).toBuffer();
         if(processed.length<originalBytes.length){
           media=new Blob([new Uint8Array(processed)],{type:'image/webp'});
           storedBytes=processed.length;optimized=true;
         }
       }
     }catch{
       return Response.json({message:'Unable to decode image. Please use a valid JPEG, PNG, WebP or AVIF.'},
         {status:400,headers:noStore});
     }
     if(storedBytes>8*1024*1024)
       return Response.json({message:'This image is too complex to optimize below 8 MB. Resize it and try again.'},
         {status:413,headers:noStore});
     filename='blog-image.'+(optimized?'webp':original.type==='image/jpeg'?'jpg':original.type.split('/')[1]);
   }
   const upstream=new FormData();upstream.set('file',media,filename);
   const response=await fetch(base.replace(/\/$/,'')+endpoint,{
      method:'POST',cache:'no-store',headers:{access_token:token},body:upstream,
      signal:AbortSignal.timeout(video?160_000:45_000),
   });
   if(!response.ok){
     const error=await response.json().catch(()=>null);
     const text=error&&typeof error.message==='string'?error.message:
       response.status===413?'Video too large. Limit is 50 MB.':'Media upload failed';
     return Response.json({message:text},{status:response.status,headers:noStore});
   }
   const raw=await response.text();
   const url=upstreamUrl(raw);
   if(!url)return Response.json({message:'Storage returned an invalid media URL'},{status:502,headers:noStore});
   let extra:Record<string,unknown>={};
   if(video){try{const record=JSON.parse(raw);if(record&&typeof record==='object'){
     extra={optimized:record.optimized===true,storedBytes:record.storedBytes||original.size,
       mimeType:record.mimeType||original.type};
   }}catch{}}
   return Response.json({url,kind:video?'video':'image',originalBytes:original.size,
     storedBytes,optimized,...extra},{headers:noStore});
 }catch{
   return Response.json({message:'Media upload failed or timed out. Please try a smaller file.'},{status:503,headers:noStore});
 }
}
