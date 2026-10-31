'use client';
import type {Route} from 'next';
import {useCallback,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,BookOpen,Check,ChevronDown,ExternalLink,
  Eye,ImagePlus,Loader2,Lock,RefreshCw,Save,Search,Send,Trash2,UploadCloud} from 'lucide-react';
import type {BlogAdminDoc,BlogDraft,BlogDocument} from '@/lib/blog-types';
import {publicBlogPath} from '@/lib/blog-types';
import {uploadBlogFile} from './BlogRichEditor';

const RichEditor=dynamic(()=>import('./BlogRichEditor'),{ssr:false,
  loading:()=> <div className="min-h-[500px] animate-pulse rounded-xl bg-rose-50"/>});
const input='w-full rounded-xl border border-[#e8dce2] bg-white px-3.5 py-2.5 text-sm text-[#412f3a] outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100';
function slugFromTitle(value:string){
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,120);
}
function FormField({name,children,hint}:{name:string;children:React.ReactNode;hint?:string}){
  return <label className="block space-y-2"><span className="block text-xs font-bold text-[#5a434f]">{name}</span>{children}
    {hint&&<span className="block text-[11px] leading-5 text-[#9b8591]">{hint}</span>}</label>;
}
export default function BlogAdminEditor({initial,canEditSeo=false}:{initial:BlogAdminDoc;canEditSeo?:boolean}){
  const router=useRouter();
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
  const coverPreview=/^https:\/\/[^\s/]+\/\S+$/.test(draft.cover.url)||
    (draft.cover.url.startsWith('/')&&!draft.cover.url.startsWith('//'));
  const estimatedWords=useMemo(()=>{
    const extract=(node:{text?:string;content?:any[]}):string=>(node.text||'')+(node.content||[]).map(extract).join(' ');
    return extract(draft.content).trim().split(/\s+/).filter(Boolean).length;
  },[draft.content]);

  async function perform(method:'PATCH'|'POST'|'DELETE',action?:'publish'|'unpublish'|'restore'){
    setBusy(true);setError('');setMessage('');
    try{
      if(action==='publish'&&dirty)throw Error('Save all edits as a draft before publishing.');
      const response=await fetch('/api/blog/admin/'+post.id+(action?'/'+action:''),{
        method,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({revision:post.revision,...(method==='PATCH'?{draft}:{})}),
      });
      const result=await response.json();
      if(!response.ok)throw Error(Array.isArray(result.message)?result.message.join(', '):result.message||'Operation failed');
      if(method==='DELETE'){router.push('/dashboard/blog');return;}
      setPost(result);
      setDraft(result.draft);
      setMessage(action==='publish'?'Article published! Public page, feeds and sitemap cache updated.':
        action==='unpublish'?'Article unpublished. It is now hidden from visitors.':
        action==='restore'?'Archived article restored as a private draft.':
        'Draft saved in MongoDB. Visitors still see the last published version.');
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Request failed');}
    finally{setBusy(false);}
  }
  async function uploadCover(file?:File){
    if(!file)return;
    setUploading(true);setError('');
    try{
      const url=await uploadBlogFile(file);
      setDraft(prev=>({...prev,cover:{url,alt:prev.cover.alt||file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')}}));
      setMessage('Cover uploaded. Remember to save the draft.');
    }catch(e){setError(e instanceof Error?e.message:'Image upload failed');}
    finally{setUploading(false);}
  }
  return <main className="min-h-screen bg-[#fbf8f8] px-4 py-7 text-[#35232e] md:px-7">
    <div className="mx-auto max-w-[1450px] space-y-6">
      <header className="rounded-[24px] bg-[#2c1c27] p-6 text-white md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link href="/dashboard/blog" className="inline-flex items-center gap-2 text-xs font-semibold text-rose-200 hover:text-white"><ArrowLeft size={16}/> All articles</Link>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#f3b2c6]"><BookOpen size={15} className="mr-2 inline"/> Editorial workspace</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">{draft.title||'Untitled article'}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className={'rounded-full px-3 py-1.5 font-bold '+(live?'bg-emerald-500/15 text-emerald-200':'bg-amber-500/15 text-amber-200')}>{post.status.toUpperCase()}</span>
              <span className="text-white/60">Revision {post.revision}</span>
              {dirty&&<span className="font-semibold text-amber-200">● Unsaved edits</span>}
              {post.publishedAt&&<span className="text-white/60">Published {new Date(post.publishedAt).toLocaleDateString()}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {live&&<Link href={publicBlogPath(post.slug) as Route} target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-xs font-semibold hover:bg-white/10"><Eye size={16}/> Live article</Link>}
            <button type="button" disabled={busy||!dirty} onClick={()=>void perform('PATCH')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-xs font-semibold hover:bg-white/10 disabled:opacity-40">
              <Save size={16}/> Save draft</button>
            <button type="button" disabled={busy||dirty||post.status==='archived'} onClick={()=>void perform('POST','publish')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f4a2b9] px-5 py-3 text-xs font-bold text-[#2c1c27] hover:bg-white disabled:opacity-40">
              {busy?<Loader2 className="animate-spin" size={16}/>:<Send size={16}/>}
              {live?'Publish update':'Publish article'}
            </button>
          </div>
        </div>
      </header>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-5 rounded-2xl border border-[#eadfe4] bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-rose-700">Article details</p>
            <FormField name="Article title *"><input dir="auto" className={input+' text-xl font-semibold'} maxLength={180}
              value={draft.title} onChange={e=>setDraft(prev=>({...prev,title:e.target.value,
                slug:!post.publishedAt&&(prev.slug.startsWith('draft-')||!prev.slug)
                  ?slugFromTitle(e.target.value):prev.slug}))} placeholder="একটি সুন্দর ও অর্থবহ শিরোনাম লিখুন"/></FormField>
            <FormField name="URL slug *" hint={post.publishedAt?'URL is locked after first publication to avoid breaking indexed links.':'Use short, meaningful words separated by hyphens.'}>
              <div className="flex gap-2">
                <input className={input+' min-w-0 flex-1 font-mono'} value={draft.slug}
                  disabled={!!post.publishedAt} onChange={e=>update('slug',slugFromTitle(e.target.value))}/>
                {!post.publishedAt&&<button type="button" className="shrink-0 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  onClick={()=>update('slug',slugFromTitle(draft.title))}>From title</button>}
              </div>
              <p className="break-all text-xs text-[#927885]">niqaha.com{slugPreview}</p>
            </FormField>
            <FormField name="Short summary / excerpt *" hint="At least 20 characters before publishing. This appears on the blog card and can be reused in search descriptions.">
              <textarea dir="auto" className={input+' min-h-28 resize-y'} maxLength={600}
                value={draft.excerpt} onChange={e=>update('excerpt',e.target.value)} placeholder="এই লেখাটি কী নিয়ে? কয়েক লাইনে বর্ণনা করুন..."/>
              <p className="text-right text-xs text-[#9a818d]">{draft.excerpt.length}/600</p>
            </FormField>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField name="Category"><input className={input} list="blog-categories" value={draft.category}
                onChange={e=>update('category',e.target.value)} placeholder="Islamic marriage"/>
                <datalist id="blog-categories"><option value="Guides"/><option value="Islamic Marriage"/><option value="Family"/><option value="Relationships"/><option value="Advice"/></datalist>
              </FormField>
              <FormField name="Author"><input className={input} value={draft.author} onChange={e=>update('author',e.target.value)} placeholder="Niqaha Editorial"/></FormField>
            </div>
            <FormField name="Tags (comma-separated)"><input className={input} value={draft.tags.join(', ')}
              onChange={e=>update('tags',e.target.value.split(',').map(v=>v.trim()).filter(Boolean))}
              placeholder="বিবাহ, ইসলামিক জীবন, পরিবার"/></FormField>
          </section>
          <section className="space-y-4 rounded-2xl border border-[#eadfe4] bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-rose-700">Rich article editor</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold">Your story</h2></div>
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">{estimatedWords} words · ~{Math.max(1,Math.ceil(estimatedWords/190))} min read</span>
            </div>
            <RichEditor initial={initial.draft.content} onChange={onContentChange}/>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-[#eadfe4] bg-white p-5 shadow-sm">
            <div><p className="text-xs font-bold uppercase tracking-[.14em] text-rose-700">Hero image</p>
              <h2 className="mt-1 font-serif text-xl font-semibold">Featured image</h2></div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br from-[#fbe7ed] to-[#f3dce6]">
              {coverPreview?<Image src={draft.cover.url} alt={draft.cover.alt||'Article cover preview'} fill unoptimized sizes="340px" className="object-cover"/>:
                <ImagePlus className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-300" size={48}/>}
            </div>
            <label className="block cursor-pointer rounded-xl border border-dashed border-rose-300 px-3 py-4 text-center text-sm font-semibold text-rose-700 hover:bg-rose-50">
              {uploading?<Loader2 size={16} className="mr-2 inline animate-spin"/>:<UploadCloud size={17} className="mr-2 inline"/>}
              {uploading?'Uploading image...':'Upload cover image'}
              <input className="sr-only" type="file" disabled={uploading} accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={e=>void uploadCover(e.target.files?.[0])}/>
            </label>
            <FormField name="Image URL (optional)"><input className={input} value={draft.cover.url} placeholder="https:// or uploaded URL"
              onChange={e=>update('cover',{...draft.cover,url:e.target.value})}/></FormField>
            <FormField name="Image alt text *" hint="Describe the photo for screen readers and image search.">
              <textarea className={input} rows={2} value={draft.cover.alt}
                onChange={e=>update('cover',{...draft.cover,alt:e.target.value})}/></FormField>
          </section>
          <section className="space-y-4 rounded-2xl border border-[#eadfe4] bg-white p-5 shadow-sm">
            <button onClick={()=>setOpenSeo(v=>!v)} className="flex w-full items-center justify-between gap-3 text-left">
              <span className="flex items-center gap-2 font-serif text-xl font-semibold"><Search size={19} className="text-rose-600"/> SEO settings</span>
              <ChevronDown size={18} className={openSeo?'rotate-180':''}/>
            </button>
            {openSeo&&<>
              <FormField name="SEO title" hint="Defaults to the article title if empty.">
                <input className={input} value={draft.seoTitle} maxLength={180} onChange={e=>update('seoTitle',e.target.value)}/>
                <p className="text-right text-[11px] text-[#9d8992]">{draft.seoTitle.length} characters</p>
              </FormField>
              <FormField name="SEO description" hint="Defaults to the article excerpt if empty.">
                <textarea className={input} value={draft.seoDescription} maxLength={350} rows={3}
                  onChange={e=>update('seoDescription',e.target.value)}/>
                <p className="text-right text-[11px] text-[#9d8992]">{draft.seoDescription.length} characters</p>
              </FormField>
              <div className="rounded-xl bg-[#fcf8fa] p-3">
                <p className="text-[11px] text-emerald-700">niqaha.com{slugPreview}</p>
                <p className="mt-1 line-clamp-2 font-medium text-[#2554b4]">{draft.seoTitle||draft.title||'Your SEO title'}</p>
                <p className="mt-1 line-clamp-3 text-xs text-[#786a73]">{draft.seoDescription||draft.excerpt||'Your meta description preview'}</p>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.noindex}
                onChange={e=>update('noindex',e.target.checked)} className="size-4 accent-rose-600"/> Noindex this article</label>
              {live&&canEditSeo&&<Link href={('/dashboard/seo?path='+encodeURIComponent(publicBlogPath(post.slug))) as Route}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 underline">Advanced SEO editor <ArrowUpRight size={13}/></Link>}
            </>}
          </section>
          <section className="space-y-4 rounded-2xl border border-[#eadfe4] bg-white p-5 shadow-sm">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Feature on blog homepage
              <input className="size-4 accent-rose-600" type="checkbox" checked={draft.featured}
                onChange={e=>update('featured',e.target.checked)}/>
            </label>
            {post.status==='archived'&&<button type="button" disabled={busy} onClick={()=>void perform('POST','restore')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-800"><RefreshCw size={15}/> Restore as draft</button>}
            <div className="border-t border-rose-100 pt-4">
              <button type="button" disabled={busy||!live} onClick={()=>{
                if(window.confirm('Remove this post from the public website? The saved article is preserved.'))void perform('POST','unpublish');
              }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800 disabled:opacity-30"><Lock size={15}/> Unpublish</button>
            </div>
            <button type="button" disabled={busy} onClick={()=>{
              if(window.confirm('Archive this article? It disappears publicly, but the content remains recoverable.'))void perform('DELETE');
            }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-30"><Trash2 size={15}/> Archive article</button>
          </section>
        </aside>
      </div>
      <div className="sticky bottom-4 z-10 flex flex-wrap justify-between gap-3 rounded-2xl border border-rose-200 bg-white/95 px-5 py-3 shadow-xl backdrop-blur">
        <Link href="/dashboard/blog" className="inline-flex items-center gap-2 text-xs font-bold text-rose-700"><ArrowLeft size={16}/> All posts</Link>
        <div className="flex items-center gap-2">
          {dirty&&<span className="hidden text-xs text-amber-700 sm:inline">Unsaved changes</span>}
          <button type="button" disabled={busy||!dirty} onClick={()=>void perform('PATCH')}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-40"><Save size={15}/> Save draft</button>
          <button type="button" disabled={busy||dirty||post.status==='archived'} onClick={()=>void perform('POST','publish')}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Send size={15}/> Publish</button>
        </div>
      </div>
    </div>
  </main>;
}
