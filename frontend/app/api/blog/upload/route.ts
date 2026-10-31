import {cookies} from 'next/headers';
import type {NextRequest} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store, max-age=0'};
async function validImageSignature(file:File){
  const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());
  const match=(arr:number[],offset=0)=>arr.every((n,i)=>bytes[i+offset]===n);
  if(file.type==='image/png')return match([137,80,78,71,13,10,26,10]);
  if(file.type==='image/jpeg')return match([255,216,255]);
  const ascii=(offset:number,length:number)=>String.fromCharCode(...bytes.slice(offset,offset+length));
  if(file.type==='image/webp')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
  if(file.type==='image/avif')return ascii(4,4)==='ftyp'&&
    ['avif','avis'].includes(ascii(8,4));
  return false;
}
export async function POST(req:NextRequest){
  const origin=req.headers.get('origin');
  if(origin){
    try{if(new URL(origin).host!==req.headers.get('host'))
      return Response.json({message:'Invalid origin'},{status:403,headers:noStore});}
    catch{return Response.json({message:'Invalid origin'},{status:403,headers:noStore});}
  }
  const token=(await cookies()).get('access_token')?.value;
  if(!token)return Response.json({message:'Admin login required'},{status:401,headers:noStore});
  if(!process.env.BASE_URL)
    return Response.json({message:'Image storage is not configured'},{status:503,headers:noStore});
  try{
    const data=await req.formData();
    const photo=data.get('file');
    if(!(photo instanceof File)||photo.size===0||photo.size>8*1024*1024||
      !['image/jpeg','image/png','image/webp','image/avif'].includes(photo.type))
      return Response.json({message:'Use JPEG, PNG, WebP or AVIF up to 8 MB'},{status:400,headers:noStore});
    if(!await validImageSignature(photo))
      return Response.json({message:'Image content does not match its file type'},
        {status:400,headers:noStore});
    const upstream=new FormData();
    const ext=photo.type.split('/')[1]==='jpeg'?'jpg':photo.type.split('/')[1];
    upstream.set('file',photo,'blog-image.'+ext);
    const response=await fetch(process.env.BASE_URL.replace(/\/$/,'')+'/image/upload-image',{
      method:'POST',cache:'no-store',headers:{access_token:token},body:upstream,
      signal:AbortSignal.timeout(30000),
    });
    if(!response.ok)return Response.json({message:'Image upload failed'},{status:response.status,headers:noStore});
    const raw=await response.json();
    const url=typeof raw==='string'?raw:
      typeof raw?.data==='string'?raw.data:raw?.url;
    if(typeof url!=='string'||!/^https?:\/\/|^\//.test(url))
      return Response.json({message:'Storage returned no public image URL'},{status:502,headers:noStore});
    return Response.json({url},{headers:noStore});
  }catch{
    return Response.json({message:'Image upload could not be completed'},{status:503,headers:noStore});
  }
}
