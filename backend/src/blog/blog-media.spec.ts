import {BadRequestException} from '@nestjs/common';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {writeFile,access} from 'node:fs/promises';
import {BlogMediaService,MAX_BLOG_VIDEO_BYTES,validBlogVideoHeader} from './blog-media.service';
import {validateBlogDocument,validateDraft} from './blog.service';
const mp4Header=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(24)]);
const webmHeader=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3,0x81,0x82]),Buffer.from('webm'),Buffer.alloc(40)]);
const doc=(source:string,title:string)=>({type:'doc',content:[
  {type:'paragraph',content:[{type:'text',text:'An article with accessible embedded video.'}]},
  {type:'video',attrs:{src:source,title,poster:'https://example.com/poster.webp'}},
]});
describe('Blog video upload validation',()=>{
 it('accepts actual MP4 and WebM headers, rejects spoofed or unsupported files',()=>{
   expect(validBlogVideoHeader(mp4Header,'video/mp4')).toBe(true);
   expect(validBlogVideoHeader(webmHeader,'video/webm')).toBe(true);
   expect(validBlogVideoHeader(Buffer.from('<script>evil</script>'),'video/mp4')).toBe(false);
   expect(validBlogVideoHeader(Buffer.from('just a renamed file'),'video/webm')).toBe(false);
   expect(validBlogVideoHeader(mp4Header,'video/quicktime')).toBe(false);
 });
 it('only stores small valid videos, and cleans temporary files after upload',async()=>{
   const data=Buffer.concat([mp4Header,Buffer.alloc(2048)]);
   const filePath=join(tmpdir(),'test-blog-'+randomUUID()+'.mp4');
   await writeFile(filePath,data);
   const mock={uploadFile:jest.fn().mockResolvedValue('https://cdn.example.com/clip.mp4')};
   const service=new BlogMediaService(mock as any);
   const result=await service.uploadVideo({path:filePath,filename:'blog-1.mp4',
     originalname:'original.mp4',mimetype:'video/mp4',size:data.length} as any);
   expect(result).toMatchObject({kind:'video',optimized:false,storedBytes:data.length});
   expect(mock.uploadFile).toHaveBeenCalledTimes(1);
   await expect(access(filePath)).rejects.toThrow();
 });
 it('rejects oversized/spoofed uploads and removes temporary copies',async()=>{
   const filePath=join(tmpdir(),'test-blog-'+randomUUID()+'.mp4');
   await writeFile(filePath,Buffer.from('this is not a video'));
   const mock={uploadFile:jest.fn()};
   const service=new BlogMediaService(mock as any);
   await expect(service.uploadVideo({path:filePath,mimetype:'video/mp4',size:18} as any))
     .rejects.toThrow(BadRequestException);
   await expect(access(filePath)).rejects.toThrow();
   const another=join(tmpdir(),'test-blog-'+randomUUID()+'.mp4');
   await writeFile(another,Buffer.alloc(10));
   await expect(service.uploadVideo({path:another,mimetype:'video/mp4',size:MAX_BLOG_VIDEO_BYTES+1} as any))
     .rejects.toThrow(BadRequestException);
   await expect(access(another)).rejects.toThrow();
   expect(mock.uploadFile).not.toHaveBeenCalled();
 });
});
describe('Safe blog video rich content',()=>{
 it('preserves a video block through draft validation with safe poster/title',()=>{
   const document=validateBlogDocument(doc('https://media.example.com/blog.mp4','Advice on the Marriage Process'));
   expect(document.content[1]).toMatchObject({type:'video',attrs:{
     src:'https://media.example.com/blog.mp4',title:'Advice on the Marriage Process',
     poster:'https://example.com/poster.webp',
   }});
   const draft=validateDraft({
     title:'Advice',slug:'advice',excerpt:'A guide about marriage and relationships.',
     author:'Editorial',category:'Guides',tags:[],
     cover:{url:'',alt:''},content:document,featured:false,noindex:false,
     seoTitle:'',seoDescription:'',
   });
   expect(draft.content.content[1].type).toBe('video');
 });
 it('blocks JavaScript URLs, fake video URLs, and videos without title',()=>{
   for(const source of ['javascript:alert(1)','https://example.com/unsafe.html','//example.com/clip.mp4']){
     expect(()=>validateBlogDocument(doc(source,'Video description')))
       .toThrow(BadRequestException);
   }
   expect(()=>validateBlogDocument(doc('https://example.com/movie.webm',''))).toThrow(BadRequestException);
 });
});
