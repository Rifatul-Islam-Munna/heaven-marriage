'use client';
import type {Route} from 'next';
import {useCallback,useMemo,useState,type ReactNode} from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,ChevronDown,ExternalLink,ImagePlus,Loader2,Lock,
  RefreshCw,Save,Send,Trash2,UploadCloud,X} from 'lucide-react';
import type {BlogAdminDoc,BlogDraft,BlogDocument} from '@/lib/blog-types';
import {publicBlogPath} from '@/lib/blog-types';
import {DashButton,DashboardHeader,DashboardPage,Panel,StatusPill,Toggle,fieldClass,labelClass} from '@/components/custom/dashboard/dashboard-kit';
import {cn} from '@/lib/utils';
import {uploadBlogFile} from './BlogRichEditor';
import {useBlogCategories} from './BlogCategoryManager';
import {blogErrorMessage} from '@/lib/blog-error';

const RichEditor=dynamic(()=>import('./BlogRichEditor'),{ssr:false,
  loading:()=> <div className="min-h-[420px] animate-pulse rounded-md bg-[#f8f9fa]"/>});
const STATUS={published:{tone:'positive',label:'Published'},draft:{tone:'warning',label:'Draft'},
  archived:{tone:'neutral',label:'Archived'}} as const;
const darkLink='inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function slugFromTitle(value:string){
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,120);
}
/** Same rule as the backend: HTTPS, same-site paths, and localhost while developing. */
function previewable(url:string){
  if(/^https:\/\/[^\s/]+\/\S+$/.test(url))return true;
  if(url.startsWith('/')&&!url.startsWith('//'))return true;
  return process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/\S+$/.test(url);
}
function Field({id,label,hint,children}:{id:string;label:string;hint?:ReactNode;children:ReactNode}){
  return <div>
    <label htmlFor={id} className={labelClass}>{label}</label>
    {children}
    {hint&&<p className="mt-1 text-[11px] leading-4 text-[#6c757d]">{hint}</p>}
  </div>;
}
function Counter({value,max}:{value:number;max:number}){
  return <span className={cn('tabular-nums',value>max*0.9?'text-amber-700':'text-[#adb5bd]')}>{value}/{max}</span>;
}

export default function BlogAdminEditor({initial,canEditSeo=false}:{initial:BlogAdminDoc;canEditSeo?:boolean}){
  const router=useRouter();
  const {categories}=useBlogCategories();
  const [post,setPost]=useState(initial);
  const [draft,setDraft]=useState<BlogDraft>(initial.draft);
  const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [openSeo,setOpenSeo]=useState(true);
  const dirty=JSON.stringify(draft)!==JSON.stringify(post.draft);
  const live=post.status==='published';
  const update=useCallback(<K extends keyof BlogDraft>(key:K,value:BlogDraft[K])=>
    setDraft(prev=>({...prev,[key]:value})),[]);
  const onContentChange=useCallback((doc:BlogDocument)=>update('content',doc),[update]);
  const slugPreview=publicBlogPath(draft.slug||post.slug);
  const coverPreview=previewable(draft.cover.url);
  const words=useMemo(()=>{
    type TextNode={text?:string;content?:TextNode[]};
    const extract=(node:TextNode):string=>(node.text||'')+(node.content||[]).map(extract).join(' ');
    return extract(draft.content as TextNode).trim().split(/\s+/).filter(Boolean).length;
  },[draft.content]);
  const minutes=Math.max(1,Math.ceil(words/190));

  async function perform(method:'PATCH'|'POST'|'DELETE',action?:'publish'|'unpublish'|'restore'){
    setBusy(true);setError('');setMessage('');
    try{
      if(action==='publish'&&dirty)throw Error('Save your edits as a draft before publishing.');
      const response=await fetch('/api/blog/admin/'+post.id+(action?'/'+action:''),{
        method,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({revision:post.revision,...(method==='PATCH'?{draft}:{})}),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(blogErrorMessage(result,'That action could not be completed.'));
      if(method==='DELETE'){router.push('/dashboard/blog');return;}
      setPost(result);
      setDraft(result.draft);
      setMessage(action==='publish'?'Published. The article is live on the website.':
        action==='unpublish'?'Unpublished. Visitors can no longer see this article.':
        action==='restore'?'Restored as a private draft.':
        'Draft saved. Visitors still see the last published version.');
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'That action could not be completed.');}
    finally{setBusy(false);}
  }
  async function uploadCover(file?:File){
    if(!file)return;
    setUploading(true);setError('');
    try{
      const url=await uploadBlogFile(file);
      setDraft(prev=>({...prev,cover:{url,alt:prev.cover.alt||file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')}}));
      setMessage('Cover uploaded. Save the draft to keep it.');
    }catch(e){setError(e instanceof Error?e.message:'The image could not be uploaded.');}
    finally{setUploading(false);}
  }

  return <DashboardPage className="pb-24">
    <DashboardHeader title={draft.title||'Untitled article'}
      meta={<>
        <StatusPill tone={STATUS[post.status].tone}>{STATUS[post.status].label}</StatusPill>
        {dirty&&<StatusPill tone="warning">Unsaved changes</StatusPill>}
      </>}
      description={<>Revision {post.revision}
        {post.publishedAt&&<> · Published {new Date(post.publishedAt).toLocaleDateString()}</>}
        {' · '}{words} words · ~{minutes} min read</>}
      actions={<>
        <Link href="/dashboard/blog" className={darkLink}><ArrowLeft size={14} aria-hidden/> All articles</Link>
        {live&&<a href={publicBlogPath(post.slug)} target="_blank" rel="noopener noreferrer" className={darkLink}>
          <ExternalLink size={14} aria-hidden/> View live</a>}
      </>}/>

    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
    {message&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{message}</p>}

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Panel title="Article details" description="Title, web address and the summary shown on blog cards.">
          <div className="space-y-4">
            <Field id="blog-title" label="Title *">
              <input id="blog-title" dir="auto" maxLength={180} value={draft.title}
                onChange={e=>setDraft(prev=>({...prev,title:e.target.value,
                  slug:!post.publishedAt&&(prev.slug.startsWith('draft-')||!prev.slug)?slugFromTitle(e.target.value):prev.slug}))}
                placeholder="একটি সুন্দর ও অর্থবহ শিরোনাম লিখুন" className={cn(fieldClass,'text-[16px] font-semibold')}/>
            </Field>
            <Field id="blog-slug" label="Web address *"
              hint={post.publishedAt?<><Lock size={11} className="mr-1 inline" aria-hidden/>Locked after the first publish so links shared on Google and social media keep working.</>
                :'Short words joined by hyphens.'}>
              <div className="flex gap-2">
                <input id="blog-slug" value={draft.slug} disabled={!!post.publishedAt}
                  onChange={e=>update('slug',slugFromTitle(e.target.value))} className={cn(fieldClass,'min-w-0 flex-1 font-mono text-[13px]')}/>
                {!post.publishedAt&&<DashButton onClick={()=>update('slug',slugFromTitle(draft.title))}>Use title</DashButton>}
              </div>
              <p className="mt-1 break-all font-mono text-[11px] text-[#868e96]">niqaha.com{slugPreview}</p>
            </Field>
            <Field id="blog-excerpt" label="Summary *" hint={<span className="flex justify-between gap-2">
              <span>At least 20 characters to publish. Shown on blog cards and used for Google when the SEO description is empty.</span>
              <Counter value={draft.excerpt.length} max={600}/></span>}>
              <textarea id="blog-excerpt" dir="auto" maxLength={600} rows={3} value={draft.excerpt}
                onChange={e=>update('excerpt',e.target.value)} placeholder="এই লেখাটি কী নিয়ে? কয়েক লাইনে বর্ণনা করুন..."
                className={cn(fieldClass,'resize-y leading-6')}/>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="blog-category" label="Category">
                <select id="blog-category" value={draft.category} className={fieldClass}
                  onChange={e=>update('category',e.target.value)}>
                  {!categories.some(item=>item.name===draft.category)&&<option value={draft.category}>{draft.category}</option>}
                  {categories.map(item=><option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-[#6c757d]">Manage categories from the <Link className="text-rose-700 underline" href="/dashboard/blog">blog dashboard</Link>.</p>
              </Field>
              <Field id="blog-author" label="Author">
                <input id="blog-author" value={draft.author} onChange={e=>update('author',e.target.value)} placeholder="Niqaha Editorial" className={fieldClass}/>
              </Field>
            </div>
            <Field id="blog-tags" label="Tags" hint="Separate tags with commas.">
              <input id="blog-tags" value={draft.tags.join(', ')}
                onChange={e=>update('tags',e.target.value.split(',').map(v=>v.trim()).filter(Boolean))}
                placeholder="বিবাহ, ইসলামিক জীবন, পরিবার" className={fieldClass}/>
            </Field>
          </div>
        </Panel>

        <Panel title="Content" actions={<span className="text-[12px] text-[#6c757d]">{words} words · ~{minutes} min read</span>}>
          <RichEditor initial={initial.draft.content} onChange={onContentChange}/>
        </Panel>
      </div>

      <aside className="space-y-4">
        <Panel title="Cover image" description="Shown at the top of the article and on blog cards.">
          <div className="space-y-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-[#e9ecef] bg-[#f8f9fa]">
              {coverPreview
                ?<Image src={draft.cover.url} alt={draft.cover.alt||'Cover preview'} fill unoptimized sizes="340px" className="object-cover"/>
                :<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[12px] text-[#adb5bd]">
                  <ImagePlus size={30} aria-hidden/>{draft.cover.url?'Preview not available for this URL':'No cover yet'}
                </div>}
            </div>
            <div className="flex gap-2">
              <label className={cn('flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-rose-700 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-rose-600',
                uploading&&'pointer-events-none opacity-60')}>
                {uploading?<Loader2 size={15} className="animate-spin" aria-hidden/>:<UploadCloud size={15} aria-hidden/>}
                {uploading?'Uploading…':draft.cover.url?'Replace image':'Upload image'}
                <input className="sr-only" type="file" disabled={uploading} accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={e=>{void uploadCover(e.target.files?.[0]);e.target.value='';}}/>
              </label>
              {draft.cover.url&&<DashButton tone="danger" aria-label="Remove cover image" onClick={()=>update('cover',{url:'',alt:''})}><X size={14}/></DashButton>}
            </div>
            <p className="text-[11px] text-[#6c757d]">JPEG, PNG, WebP or AVIF, up to 8 MB.</p>
            <Field id="blog-cover-url" label="Or paste an image URL">
              <input id="blog-cover-url" value={draft.cover.url} placeholder="https://…" className={fieldClass}
                onChange={e=>update('cover',{...draft.cover,url:e.target.value})}/>
            </Field>
            <Field id="blog-cover-alt" label="Image description *" hint="Describe the photo for screen readers and Google Images.">
              <textarea id="blog-cover-alt" rows={2} value={draft.cover.alt} className={cn(fieldClass,'resize-y')}
                onChange={e=>update('cover',{...draft.cover,alt:e.target.value})}/>
            </Field>
          </div>
        </Panel>

        <Panel title="Search preview" description="How the article can appear on Google."
          actions={<button type="button" onClick={()=>setOpenSeo(v=>!v)} aria-expanded={openSeo} aria-controls="blog-seo"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-[#495057] hover:bg-[#f1f3f5]">
            {openSeo?'Hide':'Edit'} <ChevronDown size={14} className={openSeo?'rotate-180':''} aria-hidden/></button>}>
          <div className="rounded-md border border-[#e9ecef] p-3">
            <p className="truncate text-[11px] text-emerald-700">niqaha.com{slugPreview}</p>
            <p className="mt-1 line-clamp-2 text-[14px] font-medium leading-5 text-[#1a0dab]">{draft.seoTitle||draft.title||'Your article title'}</p>
            <p className="mt-1 line-clamp-3 text-[12px] leading-5 text-[#4d5156]">{draft.seoDescription||draft.excerpt||'Your summary appears here.'}</p>
          </div>
          {openSeo&&<div id="blog-seo" className="mt-4 space-y-4">
            <Field id="blog-seo-title" label="SEO title" hint={<span className="flex justify-between gap-2"><span>Empty uses the article title.</span><Counter value={draft.seoTitle.length} max={180}/></span>}>
              <input id="blog-seo-title" maxLength={180} value={draft.seoTitle} onChange={e=>update('seoTitle',e.target.value)} className={fieldClass}/>
            </Field>
            <Field id="blog-seo-description" label="SEO description" hint={<span className="flex justify-between gap-2"><span>Empty uses the summary.</span><Counter value={draft.seoDescription.length} max={350}/></span>}>
              <textarea id="blog-seo-description" maxLength={350} rows={3} value={draft.seoDescription}
                onChange={e=>update('seoDescription',e.target.value)} className={cn(fieldClass,'resize-y')}/>
            </Field>
            <Toggle id="blog-noindex" label="Hide from search engines" description="Adds noindex so Google won’t list this article."
              checked={draft.noindex} onChange={value=>update('noindex',value)}/>
            {live&&canEditSeo&&<Link href={('/dashboard/seo?path='+encodeURIComponent(publicBlogPath(post.slug))) as Route}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-700 hover:underline">Advanced SEO editor <ArrowUpRight size={13} aria-hidden/></Link>}
          </div>}
        </Panel>

        <Panel title="Visibility">
          <div className="space-y-3">
            <Toggle id="blog-featured" label="Feature on the blog homepage" description="Shows this article in the highlighted spot."
              checked={draft.featured} onChange={value=>update('featured',value)}/>
            {post.status==='archived'&&<DashButton className="w-full" disabled={busy} onClick={()=>void perform('POST','restore')}>
              <RefreshCw size={14}/> Restore as draft</DashButton>}
            {live&&<DashButton className="w-full" disabled={busy} onClick={()=>{
              if(window.confirm('Remove this article from the website? The saved article is kept.'))void perform('POST','unpublish');
            }}><Lock size={14}/> Unpublish</DashButton>}
            {post.status!=='archived'&&<DashButton tone="danger" className="w-full" disabled={busy} onClick={()=>{
              if(window.confirm('Archive this article? It disappears from the website, but you can restore it later.'))void perform('DELETE');
            }}><Trash2 size={14}/> Archive article</DashButton>}
          </div>
        </Panel>
      </aside>
    </div>

    <div role="region" aria-label="Save and publish"
      className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1a1a2e] px-4 py-3 text-white shadow-lg">
      <p className="text-[13px]" aria-live="polite">
        {busy?'Working…':dirty?'You have unsaved changes.':live?'All changes are live.':post.status==='archived'?'This article is archived.':'Draft saved. Publish when it’s ready.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <DashButton tone="ghost-dark" disabled={busy||!dirty} onClick={()=>void perform('PATCH')}><Save size={14}/> Save draft</DashButton>
        <DashButton tone="primary" disabled={busy||dirty||post.status==='archived'} onClick={()=>void perform('POST','publish')}
          title={dirty?'Save your edits first':undefined}>
          {busy?<Loader2 size={14} className="animate-spin"/>:<Send size={14}/>} {live?'Publish update':'Publish'}
        </DashButton>
      </div>
    </div>
  </DashboardPage>;
}
