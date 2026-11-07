'use client';
import {useState} from 'react';
import {useEditor,EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {Bold,Italic,Underline,Strikethrough,Heading2,Heading3,Heading4,
  List, ListOrdered,Quote,Link2,ImagePlus,Video,Minus,Undo2,Redo2,Code2,Unlink,Loader2,UploadCloud} from 'lucide-react';
import BlogVideoExtension from './BlogVideoExtension';
import {MAX_BLOG_IMAGE_UPLOAD,validateVideoFile,videoTitleFromFile,isBlogVideoUrl,type BlogUploadResult} from '@/lib/blog-media';
import type {BlogDocument} from '@/lib/blog-types';

async function uploadBlogFile(file:File):Promise<string>{
  if(file.size>MAX_BLOG_IMAGE_UPLOAD)throw Error('Image must be 12 MB or smaller');
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw Error('Choose a JPEG, PNG, WebP or AVIF image');
  let photo=file;
  try{
    const bitmap=await createImageBitmap(file);
    if(bitmap.width>1800||bitmap.height>1800||file.size>800000){
      const factor=Math.min(1,1800/bitmap.width,1800/bitmap.height);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*factor));
      canvas.height=Math.max(1,Math.round(bitmap.height*factor));
      canvas.getContext('2d')?.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.84));
      if(blob&&blob.size<file.size)photo=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});
    }
    bitmap.close();
  }catch{/* A browser without the image encoder can upload the original file. */}
  const data=new FormData();data.set('file',photo,photo.name);
  const response=await fetch('/api/blog/upload',{method:'POST',body:data});
  const payload=await response.json();
  if(!response.ok||!payload.url)throw Error(payload.message||'Upload failed');
  return payload.url as string;
}
export {uploadBlogFile};
export async function uploadBlogVideo(file:File,onProgress?:(value:number)=>void):Promise<BlogUploadResult>{
  const error=validateVideoFile(file);
  if(error)throw Error(error);
  return new Promise((resolve,reject)=>{
    const form=new FormData();form.set('file',file,file.name);
    const xhr=new XMLHttpRequest();
    xhr.open('POST','/api/blog/upload');
    xhr.withCredentials=true;
    xhr.timeout=180000;
    xhr.upload.onprogress=(event)=>{
      if(event.lengthComputable&&event.total>0)onProgress?.(Math.min(100,Math.round(event.loaded/event.total*100)));
    };
    xhr.onerror=()=>reject(Error('Network error during video upload'));
    xhr.ontimeout=()=>reject(Error('Video processing took too long. Try a smaller MP4 file'));
    xhr.onabort=()=>reject(Error('Video upload cancelled'));
    xhr.onload=()=>{
      let result:Partial<BlogUploadResult>&{message?:string}={};
      try{result=JSON.parse(xhr.responseText);}catch{}
      if(xhr.status<200||xhr.status>=300||!result.url)
        return reject(Error(result.message||'Video upload failed'));
      resolve(result as BlogUploadResult);
    };
    xhr.send(form);
  });
}

function Tool({label,active=false,disabled=false,onClick,children}:{
 label:string;active?:boolean;disabled?:boolean;onClick:()=>void;children:React.ReactNode;
}){
  return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
    onClick={onClick} className={'flex size-9 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-35 '+
      (active?'border-rose-300 bg-rose-100 text-rose-800':'border-transparent text-[#66535f] hover:border-rose-100 hover:bg-rose-50')}>
    {children}</button>;
}
export default function BlogRichEditor({initial,onChange}:{initial:BlogDocument;onChange:(doc:BlogDocument)=>void}){
  const [imagePanel,setImagePanel]=useState(false);
  const [videoPanel,setVideoPanel]=useState(false);
  const [videoSrc,setVideoSrc]=useState('');
  const [videoTitle,setVideoTitle]=useState('');
  const [videoPoster,setVideoPoster]=useState('');
  const [videoBusy,setVideoBusy]=useState(false);
  const [videoProgress,setVideoProgress]=useState<number|null>(null);
  const [videoStatus,setVideoStatus]=useState('');
  const [src,setSrc]=useState('');
  const [alt,setAlt]=useState('');
  const [caption,setCaption]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const editor=useEditor({
    immediatelyRender:false,
    extensions:[
      StarterKit.configure({heading:{levels:[2,3,4]}}),
      Image.configure({inline:false,allowBase64:false}),
      BlogVideoExtension,
      Placeholder.configure({placeholder:'এখানে আপনার নিবন্ধ লিখুন... শিরোনাম, ছবি, তালিকা ও লিংক যোগ করুন।'}),
    ],
    content:initial,
    editorProps:{attributes:{class:'blog-editor prose prose-rose max-w-none min-h-[450px] px-7 py-7 focus:outline-none text-[#3b2e35] text-base leading-8'}},
    onUpdate:({editor})=>onChange(editor.getJSON() as BlogDocument),
  });
  if(!editor)return <div className="min-h-[470px] animate-pulse rounded-xl bg-rose-50"/>;
  async function selectFile(file?:File){
    if(!file)return;
    setError('');setBusy(true);
    try{setSrc(await uploadBlogFile(file));if(!alt)setAlt(file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '));}
    catch(e){setError(e instanceof Error?e.message:'Upload failed');}
    finally{setBusy(false);}
  }
  async function selectVideo(file?:File){
    if(!file)return;
    setError('');setVideoSrc('');setVideoPoster('');setVideoTitle(videoTitleFromFile(file.name));
    setVideoBusy(true);setVideoProgress(0);setVideoStatus('Uploading video...');
    try{
      const result=await uploadBlogVideo(file,value=>{
        setVideoProgress(value);
        if(value>=100)setVideoStatus('Upload complete. Optimizing and saving to storage...');
      });
      setVideoSrc(result.url);
      setVideoTitle(videoTitleFromFile(file.name));
      setVideoStatus(result.optimized?
        'Video compressed and uploaded successfully. Insert it below, then Save draft.':
        'Video uploaded successfully. Insert it below, then Save draft.');
    }catch(e){setError(e instanceof Error?e.message:'Video upload failed');setVideoStatus('');}
    finally{setVideoBusy(false);}
  }
  function insertVideo(){
    if(!editor)return;
    if(!isBlogVideoUrl(videoSrc)){setError('Upload an MP4/WebM video or paste a valid HTTPS video URL ending in .mp4/.webm');return;}
    if(videoTitle.trim().length<3){setError('Add a short descriptive video title');return;}
    if(videoPoster&&!/^https:\/\/[^\s]+$/.test(videoPoster)&&!(videoPoster.startsWith('/')&&!videoPoster.startsWith('//'))){
      setError('Poster image must use HTTPS or a same-site URL');return;
    }
    editor.chain().focus().insertContent({type:'video',
      attrs:{src:videoSrc.trim(),title:videoTitle.trim(),poster:videoPoster.trim()}}).run();
    setVideoPanel(false);setVideoSrc('');setVideoTitle('');setVideoPoster('');setVideoStatus('');setVideoProgress(null);setError('');
  }
  function insertImage(){
    if(!editor)return;
    if(!src.trim()||!alt.trim()){setError('Image URL and alternative text are required');return;}
    if(!/^https?:\/\//.test(src)&&!src.startsWith('/')){setError('Use an HTTPS or same-site image URL');return;}
    editor.chain().focus().setImage({src:src.trim(),alt:alt.trim(),title:caption.trim()}).run();
    setImagePanel(false);setSrc('');setAlt('');setCaption('');setError('');
  }
  function editLink(){
    if(!editor)return;
    const previous=editor.getAttributes('link').href as string||'';
    const href=window.prompt('Enter an HTTPS or internal link:',previous||'https://');
    if(href===null)return;
    if(!href){editor.chain().focus().unsetLink().run();return;}
    if(!/^https:\/\//.test(href)&&!/^mailto:/.test(href)&&!(href.startsWith('/')&&!href.startsWith('//'))){
      setError('Use an HTTPS URL, a relative site URL or mailto:');return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({href}).run();
  }
  return <div className="overflow-hidden rounded-2xl border border-[#eadde3] bg-white shadow-sm">
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[#eee3e7] bg-[#fffbfc] p-2" role="toolbar" aria-label="Article formatting">
      <Tool label="Bold" active={editor.isActive('bold')} onClick={()=>editor.chain().focus().toggleBold().run()}><Bold size={16}/></Tool>
      <Tool label="Italic" active={editor.isActive('italic')} onClick={()=>editor.chain().focus().toggleItalic().run()}><Italic size={16}/></Tool>
      <Tool label="Underline" active={editor.isActive('underline')} onClick={()=>editor.chain().focus().toggleUnderline().run()}><Underline size={16}/></Tool>
      <Tool label="Strike" active={editor.isActive('strike')} onClick={()=>editor.chain().focus().toggleStrike().run()}><Strikethrough size={16}/></Tool>
      <span className="mx-1 h-6 w-px bg-rose-100"/>
      {[2,3,4].map(level=><Tool key={level} label={'Heading '+level}
        active={editor.isActive('heading',{level})} onClick={()=>editor.chain().focus().toggleHeading({level:level as 2|3|4}).run()}>
        {level===2?<Heading2 size={17}/>:level===3?<Heading3 size={17}/>:<Heading4 size={17}/>}</Tool>)}
      <Tool label="Bullet list" active={editor.isActive('bulletList')} onClick={()=>editor.chain().focus().toggleBulletList().run()}><List size={16}/></Tool>
      <Tool label="Numbered list" active={editor.isActive('orderedList')} onClick={()=>editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16}/></Tool>
      <Tool label="Block quote" active={editor.isActive('blockquote')} onClick={()=>editor.chain().focus().toggleBlockquote().run()}><Quote size={16}/></Tool>
      <Tool label="Code block" active={editor.isActive('codeBlock')} onClick={()=>editor.chain().focus().toggleCodeBlock().run()}><Code2 size={16}/></Tool>
      <Tool label="Horizontal rule" onClick={()=>editor.chain().focus().setHorizontalRule().run()}><Minus size={16}/></Tool>
      <span className="mx-1 h-6 w-px bg-rose-100"/>
      <Tool label="Add or edit link" active={editor.isActive('link')} onClick={editLink}><Link2 size={16}/></Tool>
      <Tool label="Remove link" onClick={()=>editor.chain().focus().unsetLink().run()}><Unlink size={16}/></Tool>
      <Tool label="Insert image" active={imagePanel} onClick={()=>{setImagePanel(v=>!v);setVideoPanel(false);setError('')}}><ImagePlus size={17}/></Tool>
      <Tool label="Insert video" active={videoPanel} onClick={()=>{setVideoPanel(v=>!v);setImagePanel(false);setError('')}}><Video size={17}/></Tool>
      <span className="mx-1 h-6 w-px bg-rose-100"/>
      <Tool label="Undo" disabled={!editor.can().undo()} onClick={()=>editor.chain().focus().undo().run()}><Undo2 size={16}/></Tool>
      <Tool label="Redo" disabled={!editor.can().redo()} onClick={()=>editor.chain().focus().redo().run()}><Redo2 size={16}/></Tool>
    </div>
    {imagePanel&&<div className="space-y-3 border-b border-rose-100 bg-[#fff7f9] p-5">
      <h3 className="font-semibold text-rose-900">Add an article image</h3>
      <label className="block cursor-pointer rounded-xl border border-dashed border-rose-300 bg-white px-5 py-4 text-center text-sm font-semibold text-rose-700">
        {busy?<Loader2 size={18} className="mr-2 inline animate-spin"/>:<ImagePlus size={18} className="mr-2 inline"/>}
        {busy?'Uploading...':'Upload JPEG, PNG, WebP or AVIF (up to 12 MB, automatically optimized)'}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy}
          className="sr-only" onChange={e=>{void selectFile(e.target.files?.[0]);e.target.value='';}}/>
      </label>
      <input aria-label="Image URL" value={src} onChange={e=>setSrc(e.target.value)} placeholder="Image URL (or upload above)" className="w-full rounded-lg border px-3 py-2 text-sm"/>
      <input aria-label="Image alt text" value={alt} onChange={e=>setAlt(e.target.value)} placeholder="Describe the image for accessibility and SEO *" className="w-full rounded-lg border px-3 py-2 text-sm"/>
      <input aria-label="Image caption" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption (optional)" className="w-full rounded-lg border px-3 py-2 text-sm"/>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={insertImage} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Insert image</button>
        <button type="button" onClick={()=>setImagePanel(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button></div>
    </div>}
    {videoPanel&&<section className="space-y-3 border-b border-rose-100 bg-[#fff7f9] p-5" aria-label="Insert an article video">
      <h3 className="text-[15px] font-semibold text-rose-900">Add an article video</h3>
      <p className="text-[12px] leading-5 text-[#66535f]">MP4 (H.264) or WebM, maximum 50 MB. For fast loading, export at 720p / 30 fps. Videos above 15 MB may be compressed automatically when FFmpeg is available on your server.</p>
      <label className="block cursor-pointer rounded-xl border border-dashed border-rose-300 bg-white px-5 py-4 text-center text-sm font-semibold text-rose-700">
        {videoBusy?<Loader2 size={18} className="mr-2 inline animate-spin"/>:<UploadCloud size={18} className="mr-2 inline"/>}
        {videoBusy?'Processing video...':'Choose MP4 or WebM video'}
        <input type="file" accept="video/mp4,video/webm" disabled={videoBusy}
          className="sr-only" onChange={e=>{void selectVideo(e.target.files?.[0]);e.target.value='';}}/>
      </label>
      {videoBusy&&<div className="space-y-1" role="status">
        <div className="h-2 overflow-hidden rounded-full bg-rose-100">
          <div className="h-full rounded-full bg-rose-600 transition-[width]" style={{width:(videoProgress??0)+'%'}}/>
        </div>
        <p className="text-xs text-rose-800">{videoProgress??0}% sent · {videoStatus}</p>
      </div>}
      {!videoBusy&&videoStatus&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{videoStatus}</p>}
      <label className="block text-xs font-semibold text-[#66535f]">Video URL
        <input value={videoSrc} onChange={e=>setVideoSrc(e.target.value)} placeholder="Upload above or paste an HTTPS .mp4 / .webm URL" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
      <label className="block text-xs font-semibold text-[#66535f]">Video title (required, accessible description)
        <input value={videoTitle} maxLength={250} onChange={e=>setVideoTitle(e.target.value)} placeholder="Briefly describe the video" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
      <label className="block text-xs font-semibold text-[#66535f]">Poster / thumbnail URL (optional)
        <input value={videoPoster} onChange={e=>setVideoPoster(e.target.value)} placeholder="https://…/thumbnail.webp" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>
      {videoSrc&&isBlogVideoUrl(videoSrc)&&<video src={videoSrc} poster={videoPoster||undefined}
        controls preload="metadata" playsInline className="aspect-video w-full max-w-2xl rounded-xl bg-slate-950" aria-label={videoTitle||'Uploaded video preview'}/>}
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={videoBusy||!videoSrc||!videoTitle.trim()} onClick={insertVideo}
          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Insert video in article</button>
        <button type="button" disabled={videoBusy} onClick={()=>{setVideoPanel(false);setError('')}}
          className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
      </div>
    </section>}
    <EditorContent editor={editor}/>
    <p className="border-t border-[#eee3e7] bg-[#fffafb] px-5 py-2 text-xs text-[#95808d]">Use H2–H4 for article sections. Images are optimized automatically. Add an MP4/WebM video using the Video button, then Save draft before publishing.</p>
  </div>;
}
