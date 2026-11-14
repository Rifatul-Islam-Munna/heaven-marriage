import {BadRequestException,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {open,stat,unlink} from 'node:fs/promises';
import {basename,dirname,join} from 'node:path';
import {MinioService} from '../lib/minio.service';
import {
  getMediaFormat,hasValidMediaHeader,MAX_IMAGE_BYTES,MAX_VIDEO_BYTES,
  type MediaFormat,
} from './media-upload';

type CommandResult={ok:boolean;missing:boolean;stdout:string};
function command(binary:string,args:string[],timeoutMs:number):Promise<CommandResult>{
  return new Promise(resolve=>{
    let finished=false,stdout='';
    const child=spawn(binary,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});
    const timer=setTimeout(()=>{child.kill('SIGKILL');done(false);},timeoutMs);
    function done(ok:boolean,missing=false){
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      resolve({ok,missing,stdout});
    }
    child.stdout?.on('data',(data:Buffer)=>{if(stdout.length<8192)stdout+=data.toString();});
    child.stderr?.on('data',()=>{});
    child.on('error',(error:NodeJS.ErrnoException)=>done(false,error.code==='ENOENT'));
    child.on('close',code=>done(code===0));
  });
}

type VideoPlan={convert:boolean;copyVideo:boolean};
async function videoPlan(file:Express.Multer.File,format:MediaFormat):Promise<VideoPlan>{
  const probe=await command(process.env.FFPROBE_PATH||'ffprobe',[
    '-v','error','-show_entries','stream=codec_name,codec_type,pix_fmt','-of','json',file.path,
  ],15000);
  if(probe.missing)return {convert:format.convert,copyVideo:false};
  if(!probe.ok)throw new BadRequestException('This video could not be read');
  let streams:{codec_name?:string;codec_type?:string;pix_fmt?:string}[];
  try{streams=(JSON.parse(probe.stdout) as {streams:typeof streams}).streams||[];}
  catch{throw new BadRequestException('Invalid video metadata');}
  const videoStream=streams.find(x=>x.codec_type==='video');
  const video=videoStream?.codec_name;
  const audio=streams.find(x=>x.codec_type==='audio')?.codec_name;
  if(!video)throw new BadRequestException('Video file has no playable video track');
  const copyVideo=video==='h264'&&
    ['yuv420p','yuvj420p'].includes(videoStream?.pix_fmt||'');
  const directWebm=format.extension==='webm'&&
    ['vp8','vp9','av1'].includes(video)&&(!audio||['opus','vorbis'].includes(audio));
  const directMp4=['mp4','m4v'].includes(format.extension)&&copyVideo&&
    (!audio||['aac','mp3'].includes(audio));
  return {convert:!directWebm&&!directMp4,copyVideo};
}

async function convertMedia(file:Express.Multer.File,kind:'image'|'video',copyVideo=false){
  const extension=kind==='video'?'mp4':'webp';
  const output=join(dirname(file.path),'media-'+randomUUID()+'.'+extension);
  const videoArgs=(copy:boolean)=>[
    '-nostdin','-hide_banner','-loglevel','error','-y','-i',file.path,
    '-map','0:v:0','-map','0:a:0?',
    ...(copy?['-c:v','copy']:[
      '-vf','scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p',
    ]),
    '-c:a','aac','-b:a','128k','-movflags','+faststart','-threads','2',output,
  ];
  const args=kind==='video'?videoArgs(copyVideo):
    ['-nostdin','-hide_banner','-loglevel','error','-y','-i',file.path,
      '-frames:v','1','-vf',
      'scale=1920:1920:force_original_aspect_ratio=decrease',
      '-c:v','libwebp','-quality','82','-threads','2',output];
  try{
    let result=await command(process.env.FFMPEG_PATH||'ffmpeg',args,kind==='video'?80000:30000);
    // Some containers cannot be remuxed directly; fall back to transcoding.
    if(!result.ok&&!result.missing&&kind==='video'&&copyVideo)
      result=await command(process.env.FFMPEG_PATH||'ffmpeg',videoArgs(false),80000);
    if(result.missing)throw new ServiceUnavailableException(
      'The server needs FFmpeg installed to convert this media format');
    if(!result.ok)throw new BadRequestException(
      kind==='video'?'Unable to convert this video. Try MP4 (H.264) or WebM.':
      'Unable to convert this image. Try JPEG, PNG, or WebP.');
    const outputStat=await stat(output);
    if(outputStat.size<1||outputStat.size>MAX_VIDEO_BYTES)
      throw new BadRequestException('Converted media is too large');
    return {...file,path:output,filename:basename(output),
      size:outputStat.size,mimetype:kind==='video'?'video/mp4':'image/webp'};
  }catch(error){
    await unlink(output).catch(()=>{});
    throw error;
  }
}

@Injectable()
export class ImageService {
  constructor(private readonly minioService:MinioService){}

  async uploadImage(file:Express.Multer.File|undefined):Promise<string>{
    if(!file)throw new BadRequestException('Choose an image, video or PDF');
    const cleanup=new Set<string>([file.path]);
    try{
      const format=getMediaFormat(file.originalname,file.mimetype);
      if(!format)throw new BadRequestException('Unsupported media format');
      const maxBytes=format.kind==='video'?MAX_VIDEO_BYTES:MAX_IMAGE_BYTES;
      if(file.size<1||file.size>maxBytes)
        throw new BadRequestException(
          format.kind==='video'?'Video must be 80 MB or smaller':
          'Image or document must be 25 MB or smaller');
      const handle=await open(file.path,'r');
      const header=Buffer.alloc(4096);
      try{await handle.read(header,0,header.length,0);}
      finally{await handle.close();}
      if(!hasValidMediaHeader(header,format.extension))
        throw new BadRequestException('File content does not match a supported media format');

      let selected:Express.Multer.File={...file,mimetype:format.mime};
      const plan=format.kind==='video'?
        await videoPlan(file,format):{convert:format.convert,copyVideo:false};
      if(plan.convert){
        selected=await convertMedia(file,format.kind==='video'?'video':'image',plan.copyVideo);
        cleanup.add(selected.path);
      }
      return await this.minioService.uploadFile(selected);
    }finally{
      await Promise.all([...cleanup].map(path=>unlink(path).catch(()=>{})));
    }
  }
}
