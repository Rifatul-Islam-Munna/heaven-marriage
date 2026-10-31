'use client';
import {useState} from 'react';
import {useEditor,EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {Bold,Italic,Underline,Strikethrough,Heading2,Heading3,Heading4,
  List, ListOrdered,Quote,Link2,ImagePlus,Minus,Undo2,Redo2,Code2,Unlink,Loader2} from 'lucide-react';
import type {BlogDocument} from '@/lib/blog-types';

async function uploadBlogFile(file:File):Promise<string>{
  if(file.size>8*1024*1024)throw Error('Image must be 8 MB or smaller');
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
      <Tool label="Insert image" active={imagePanel} onClick={()=>setImagePanel(v=>!v)}><ImagePlus size={17}/></Tool>
      <span className="mx-1 h-6 w-px bg-rose-100"/>
      <Tool label="Undo" disabled={!editor.can().undo()} onClick={()=>editor.chain().focus().undo().run()}><Undo2 size={16}/></Tool>
      <Tool label="Redo" disabled={!editor.can().redo()} onClick={()=>editor.chain().focus().redo().run()}><Redo2 size={16}/></Tool>
    </div>
    {imagePanel&&<div className="space-y-3 border-b border-rose-100 bg-[#fff7f9] p-5">
      <h3 className="font-semibold text-rose-900">Add an article image</h3>
      <label className="block cursor-pointer rounded-xl border border-dashed border-rose-300 bg-white px-5 py-4 text-center text-sm font-semibold text-rose-700">
        {busy?<Loader2 size={18} className="mr-2 inline animate-spin"/>:<ImagePlus size={18} className="mr-2 inline"/>}
        {busy?'Uploading...':'Upload JPEG, PNG, WebP or AVIF (up to 8 MB)'}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy}
          className="sr-only" onChange={e=>void selectFile(e.target.files?.[0])}/>
      </label>
      <input aria-label="Image URL" value={src} onChange={e=>setSrc(e.target.value)} placeholder="Image URL (or upload above)" className="w-full rounded-lg border px-3 py-2 text-sm"/>
      <input aria-label="Image alt text" value={alt} onChange={e=>setAlt(e.target.value)} placeholder="Describe the image for accessibility and SEO *" className="w-full rounded-lg border px-3 py-2 text-sm"/>
      <input aria-label="Image caption" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption (optional)" className="w-full rounded-lg border px-3 py-2 text-sm"/>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={insertImage} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Insert image</button>
        <button type="button" onClick={()=>setImagePanel(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button></div>
    </div>}
    <EditorContent editor={editor}/>
    <p className="border-t border-[#eee3e7] bg-[#fffafb] px-5 py-2 text-xs text-[#95808d]">Use H2–H4 for article sections. Images are compressed when possible; alt text is required. Paste text or use the toolbar to format it.</p>
  </div>;
}
