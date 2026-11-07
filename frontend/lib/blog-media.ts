export type BlogUploadResult={
 url:string;kind:'image'|'video';originalBytes:number;storedBytes:number;optimized:boolean;
 mimeType?:string;
};
export const MAX_BLOG_IMAGE_UPLOAD=12*1024*1024;
export const MAX_BLOG_VIDEO_UPLOAD=50*1024*1024;
export const VIDEO_MIME_TYPES=['video/mp4','video/webm'] as const;
export function validateVideoFile(file:Pick<File,'type'|'size'>):string|null{
 if(!VIDEO_MIME_TYPES.includes(file.type as typeof VIDEO_MIME_TYPES[number]))
   return 'Please use an MP4 or WebM video (MP4/H.264 works best across devices).';
 if(file.size<=0||file.size>MAX_BLOG_VIDEO_UPLOAD)
   return 'Video must be no larger than 50 MB. Export at 720p with H.264 for a smaller file.';
 return null;
}
export function videoTitleFromFile(filename:string){
 return filename.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').trim().slice(0,120)||'Article video';
}
export function isBlogVideoUrl(raw:string){
 try{
   const url=raw.startsWith('/')&&!raw.startsWith('//')?new URL(raw,'https://niqaha.com'):new URL(raw);
   if(!(raw.startsWith('/')&&!raw.startsWith('//'))&&url.protocol!=='https:')return false;
   if(url.username||url.password||url.hash)return false;
   return /\.(mp4|webm)$/i.test(url.pathname);
 }catch{return false;}
}
