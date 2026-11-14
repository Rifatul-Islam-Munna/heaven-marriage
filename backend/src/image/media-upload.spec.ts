import {BadRequestException} from '@nestjs/common';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {access,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ImageService} from './image.service';
import {getMediaFormat,hasValidMediaHeader,MAX_VIDEO_BYTES} from './media-upload';
import type {MinioService} from '../lib/minio.service';

const at=(extension:string)=>join(tmpdir(),'niqaha-test-'+randomUUID()+'.'+extension);
const file=(path:string,name:string,mime:string,size:number)=>({
  path,originalname:name,filename:path.split(/[\\/]/).pop(),mimetype:mime,size,
}) as Express.Multer.File;
const configured=spawnSync('ffmpeg',['-version'],{timeout:3000,windowsHide:true}).status===0 &&
  spawnSync('ffprobe',['-version'],{timeout:3000,windowsHide:true}).status===0;
const withFFmpeg=configured?it:it.skip;

describe('media upload file formats',()=>{
  it.each([
    ['image.jpeg','image/jpeg','image',false],
    ['photo.heic','application/octet-stream','image',true],
    ['picture.tiff','image/tiff','image',true],
    ['animation.gif','image/gif','image',false],
    ['desktop.mp4','video/mp4','video',false],
    ['phone.MOV','video/quicktime','video',true],
    ['clip.mkv','video/x-matroska','video',true],
    ['recording.avi','video/x-msvideo','video',true],
    ['old.flv','video/x-flv','video',true],
    ['legacy.wmv','video/x-ms-wmv','video',true],
    ['movie.3gp','video/3gpp','video',true],
    ['a.pdf','application/pdf','document',false],
  ])('classifies %s correctly', (name,mime,kind,convert)=>{
    expect(getMediaFormat(name,mime)).toMatchObject({kind,convert});
  });

  it('rejects unsupported/contradictory types',()=>{
    expect(getMediaFormat('attack.svg','image/svg+xml')).toBeNull();
    expect(getMediaFormat('attack.html','text/html')).toBeNull();
    expect(getMediaFormat('movie.mp4','image/jpeg')).toBeNull();
  });

  it('accepts real file headers and rejects renamed HTML',()=>{
    const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0]);
    const png=Buffer.from([137,80,78,71,13,10,26,10]);
    const mp4=Buffer.concat([Buffer.from([0,0,0,20]),Buffer.from('ftypisom'),Buffer.alloc(40)]);
    const mov=Buffer.concat([Buffer.from([0,0,0,20]),Buffer.from('ftypqt  '),Buffer.alloc(40)]);
    const avi=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('AVI '),Buffer.alloc(16)]);
    const webm=Buffer.from([0x1a,0x45,0xdf,0xa3,0x81,0x82]);
    const heic=Buffer.concat([Buffer.from([0,0,0,20]),Buffer.from('ftypheic'),Buffer.alloc(40)]);
    for(const [bytes,extension] of [
      [jpeg,'jpg'],[png,'png'],[mp4,'mp4'],[mov,'mov'],[avi,'avi'],
      [webm,'webm'],[heic,'heic'],
    ] as const)expect(hasValidMediaHeader(bytes,extension)).toBe(true);
    for(const extension of ['jpg','png','mp4','mov','avi','mkv','pdf','heic'])
      expect(hasValidMediaHeader(Buffer.from('<html>not a media file</html>'),extension)).toBe(false);
  });
});

describe('ImageService media uploads',()=>{
  it('stores supported photos and deletes the temporary file',async()=>{
    const path=at('png');
    const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(128)]);
    await writeFile(path,bytes);
    const minio={uploadFile:jest.fn(async()=> 'https://example.com/public/image.png')};
    const service=new ImageService(minio as unknown as MinioService);
    await expect(service.uploadImage(file(path,'photo.png','image/png',bytes.length)))
      .resolves.toBe('https://example.com/public/image.png');
    expect(minio.uploadFile).toHaveBeenCalledWith(expect.objectContaining({mimetype:'image/png'}));
    await expect(access(path)).rejects.toThrow();
  });

  it('rejects spoofed video, cleans up, and never sends it to MinIO',async()=>{
    const path=at('mp4');
    const bytes=Buffer.from('<script>Not a video</script>');
    await writeFile(path,bytes);
    const minio={uploadFile:jest.fn()};
    const service=new ImageService(minio as unknown as MinioService);
    await expect(service.uploadImage(file(path,'fake.mp4','video/mp4',bytes.length)))
      .rejects.toThrow(BadRequestException);
    expect(minio.uploadFile).not.toHaveBeenCalled();
    await expect(access(path)).rejects.toThrow();
  });

  it('rejects huge videos before storage and cleans up',async()=>{
    const path=at('mov');
    await writeFile(path,Buffer.from('ftyp'));
    const minio={uploadFile:jest.fn()};
    await expect(new ImageService(minio as unknown as MinioService)
      .uploadImage(file(path,'huge.mov','video/quicktime',MAX_VIDEO_BYTES+1)))
      .rejects.toThrow(BadRequestException);
    await expect(access(path)).rejects.toThrow();
  });

  withFFmpeg('converts a valid MOV video into a browser-compatible MP4 before storing',async()=>{
    const path=at('mov');
    const created=spawnSync('ffmpeg',[
      '-nostdin','-hide_banner','-loglevel','error','-y',
      '-f','lavfi','-i','color=c=black:s=64x64:r=10',
      '-t','1','-c:v','mpeg4','-an',path,
    ],{timeout:12000,windowsHide:true});
    expect(created.status).toBe(0);
    const inputSize=(await readFile(path)).length;
    const minio={uploadFile:jest.fn(async(selected:Express.Multer.File)=>{
      expect(selected.mimetype).toBe('video/mp4');
      expect(selected.filename).toMatch(/\.mp4$/);
      expect((await readFile(selected.path)).length).toBeGreaterThan(100);
      return 'https://example.com/public/converted.mp4';
    })};
    await expect(new ImageService(minio as unknown as MinioService)
      .uploadImage(file(path,'holiday.mov','video/quicktime',inputSize)))
      .resolves.toBe('https://example.com/public/converted.mp4');
    expect(minio.uploadFile).toHaveBeenCalledTimes(1);
    await expect(access(path)).rejects.toThrow();
  });
});

describe('Real FFmpeg format compatibility',()=>{
  withFFmpeg('turns BMP into WebP so it displays in the image slots',async()=>{
    const path=at('bmp');
    const created=spawnSync('ffmpeg',[
      '-nostdin','-hide_banner','-loglevel','error','-y',
      '-f','lavfi','-i','color=c=red:s=64x64',
      '-frames:v','1',path,
    ],{timeout:12000,windowsHide:true});
    expect(created.status).toBe(0);
    const size=(await readFile(path)).length;
    const minio={uploadFile:jest.fn(async(selected:Express.Multer.File)=>{
      expect(selected.mimetype).toBe('image/webp');
      expect(selected.filename).toMatch(/\.webp$/);
      const data=await readFile(selected.path);
      expect(data.toString('ascii',0,4)).toBe('RIFF');
      expect(data.toString('ascii',8,12)).toBe('WEBP');
      return 'https://example.com/public/converted.webp';
    })};
    await expect(new ImageService(minio as unknown as MinioService)
      .uploadImage(file(path,'source.bmp','image/bmp',size)))
      .resolves.toBe('https://example.com/public/converted.webp');
    await expect(access(path)).rejects.toThrow();
  });

  withFFmpeg('remuxes H.264 MOV to MP4 without shrinking the video',async()=>{
    const path=at('mov');
    const created=spawnSync('ffmpeg',[
      '-nostdin','-hide_banner','-loglevel','error','-y',
      '-f','lavfi','-i','color=c=blue:s=320x768:r=10',
      '-t','1','-c:v','libx264','-pix_fmt','yuv420p','-an',path,
    ],{timeout:15000,windowsHide:true});
    expect(created.status).toBe(0);
    const size=(await readFile(path)).length;
    const minio={uploadFile:jest.fn(async(selected:Express.Multer.File)=>{
      expect(selected.mimetype).toBe('video/mp4');
      const probe=spawnSync('ffprobe',[
        '-v','error','-select_streams','v:0',
        '-show_entries','stream=width,height,codec_name','-of','json',selected.path,
      ],{timeout:8000,windowsHide:true,encoding:'utf8'});
      expect(probe.status).toBe(0);
      const streams=JSON.parse(probe.stdout).streams;
      expect(streams[0]).toMatchObject({codec_name:'h264',width:320,height:768});
      return 'https://example.com/public/remux.mp4';
    })};
    await expect(new ImageService(minio as unknown as MinioService)
      .uploadImage(file(path,'phone.mov','video/quicktime',size)))
      .resolves.toBe('https://example.com/public/remux.mp4');
    await expect(access(path)).rejects.toThrow();
  });
});
