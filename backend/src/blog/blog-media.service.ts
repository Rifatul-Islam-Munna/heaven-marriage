import {BadRequestException,Injectable} from '@nestjs/common';
import {MinioService} from '../lib/minio.service';
import {open,stat,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {dirname,join} from 'node:path';

export const MAX_BLOG_VIDEO_BYTES=50*1024*1024;
export const BLOG_VIDEO_MIMES=['video/mp4','video/webm'] as const;
export function validBlogVideoHeader(bytes:Uint8Array,mime:string):boolean{
 const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
 if(mime==='video/mp4'){
   if(bytes.length<12||ascii(4,8)!=='ftyp')return false;
   return /^(isom|iso2|iso3|iso4|iso5|iso6|mp41|mp42|avc1|M4V |dash)$/.test(ascii(8,12));
 }
 if(mime==='video/webm'){
   return bytes.length>20&&[0x1a,0x45,0xdf,0xa3].every((b,i)=>bytes[i]===b)
     &&ascii(0,bytes.length).includes('webm');
 }
 return false;
}

async function transcodeLargeVideo(file:Express.Multer.File):Promise<Express.Multer.File|null>{
 if(file.size<=15*1024*1024||process.env.BLOG_VIDEO_TRANSCODE==='false')return null;
 const target=join(dirname(file.path),'blog-optimized-'+randomUUID()+'.mp4');
 let keepOutput=false;
 const args=['-nostdin','-hide_banner','-loglevel','error','-y','-i',file.path,
   '-map','0:v:0','-map','0:a?','-vf',
   'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2',
   '-c:v','libx264','-preset','veryfast','-crf','28',
   '-c:a','aac','-b:a','96k','-movflags','+faststart',
   '-max_muxing_queue_size','1024',target];
 try{
   const success=await new Promise<boolean>(resolve=>{
     let finished=false;
     const child=spawn(process.env.FFMPEG_PATH||'ffmpeg',args,{windowsHide:true,stdio:'ignore'});
     const done=(ok:boolean)=>{if(!finished){finished=true;clearTimeout(timeout);resolve(ok);}};
     const timeout=setTimeout(()=>{child.kill('SIGKILL');done(false);},90_000);
     child.on('error',()=>done(false));
     child.on('exit',code=>done(code===0));
   });
   if(!success)return null;
   const output=await stat(target);
   if(output.size<1024||output.size>=file.size||output.size>MAX_BLOG_VIDEO_BYTES)return null;
   keepOutput=true;
   return {...file,path:target,filename:target.split(/[\\/]/).pop()||'blog-video.mp4',
     size:output.size,mimetype:'video/mp4',originalname:'blog-video.mp4'};
 }catch{return null;}
 finally{
   if(!keepOutput)await unlink(target).catch(()=>{});
 }
}
@Injectable()
export class BlogMediaService{
 constructor(private readonly minio:MinioService){}
 async uploadVideo(file:Express.Multer.File|undefined){
   if(!file)throw new BadRequestException('Choose a video file');
   const cleanup=new Set<string>([file.path]);
   try{
     if(file.size<1024||file.size>MAX_BLOG_VIDEO_BYTES||
       !BLOG_VIDEO_MIMES.includes(file.mimetype as typeof BLOG_VIDEO_MIMES[number]))
       throw new BadRequestException('Upload MP4 or WebM, up to 50 MB');
     const handle=await open(file.path,'r');
     const header=Buffer.alloc(1024);
     try{await handle.read(header,0,header.length,0);}finally{await handle.close();}
     if(!validBlogVideoHeader(header,file.mimetype))
       throw new BadRequestException('Video does not match MP4/WebM content');
     const optimized=await transcodeLargeVideo(file);
     if(optimized)cleanup.add(optimized.path);
     const selected=optimized??file;
     const url=await this.minio.uploadFile(selected);
     return {url,kind:'video',mimeType:selected.mimetype,originalBytes:file.size,
       storedBytes:selected.size,optimized:!!optimized};
   }finally{
     await Promise.all([...cleanup].map(path=>unlink(path).catch(()=>{})));
   }
 }
}
