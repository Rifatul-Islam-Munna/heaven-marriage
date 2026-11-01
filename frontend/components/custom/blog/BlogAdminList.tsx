'use client';
import type {Route} from 'next';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {BookOpen,ExternalLink,FileText,Loader2,PenLine,Plus,RefreshCw,Search,X} from 'lucide-react';
import {publicBlogPath,type BlogAdminRow} from '@/lib/blog-types';
import {
  DashButton,DashboardHeader,DashboardPage,KpiCard,KpiRow,Panel,PlainHeader,Segmented,StatusPill,fieldClass,formatWhen,
} from '@/components/custom/dashboard/dashboard-kit';
import {cn} from '@/lib/utils';
import BlogCategoryManager,{useBlogCategories} from './BlogCategoryManager';
import {blogErrorMessage} from '@/lib/blog-error';

type StatusFilter='all'|BlogAdminRow['status'];
const STATUS_TONE={published:'positive',draft:'warning',archived:'neutral'} as const;
const STATUS_LABEL={published:'Published',draft:'Draft',archived:'Archived'} as const;
const editHref=(id:string)=>('/dashboard/blog/'+id) as Route;

function Cover({item,className}:{item:BlogAdminRow;className:string}){
  return <div className={cn('relative shrink-0 overflow-hidden rounded-md bg-rose-50',className)}>
    {item.cover?.url
      ?<Image src={item.cover.url} alt={item.cover.alt||''} unoptimized fill sizes="96px" className="object-cover"/>
      :<BookOpen size={18} aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-300"/>}
  </div>;
}

function LiveLink({item}:{item:BlogAdminRow}){
  if(item.status!=='published')return null;
  return <a href={publicBlogPath(item.slug)} target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium text-[#495057] hover:bg-[#f1f3f5]">
    <ExternalLink size={13} aria-hidden/> View<span className="sr-only"> {item.title||'article'} on the website</span>
  </a>;
}

export default function BlogAdminList(){
  const router=useRouter();
  const {categories,refresh:refreshCategories}=useBlogCategories();
  const [items,setItems]=useState<BlogAdminRow[]>([]);
  const [query,setQuery]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState<StatusFilter>('all');
  const [creating,setCreating]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  // Wait for a pause in typing instead of hitting the API on every keystroke.
  useEffect(()=>{const t=window.setTimeout(()=>setSearch(query.trim()),300);return()=>window.clearTimeout(t);},[query]);
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch('/api/blog/admin?q='+encodeURIComponent(search),{cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(blogErrorMessage(data,'Articles could not be loaded.'));
      setItems(data.items||[]);
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'Articles could not be loaded.');}
    finally{setLoading(false);}
  },[search]);
  useEffect(()=>{void load();},[load]);
  async function create(){
    setCreating(true);setError('');
    try{
      const r=await fetch('/api/blog/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const result=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(blogErrorMessage(result,'The new article could not be created.'));
      router.push(editHref(result.id));
    }catch(e){setError(e instanceof Error?e.message:'The new article could not be created.');setCreating(false);}
  }
  const counts=useMemo(()=>({
    all:items.length,
    published:items.filter(x=>x.status==='published').length,
    draft:items.filter(x=>x.status==='draft').length,
    archived:items.filter(x=>x.status==='archived').length,
  }),[items]);
  const rows=items.filter(item=>status==='all'||item.status===status);
  const filtering=!!search||status!=='all';
  const newButton=<DashButton tone="primary" disabled={creating} onClick={()=>void create()}>
    {creating?<Loader2 size={15} className="animate-spin"/>:<Plus size={15}/>} New article
  </DashButton>;

  return <DashboardPage>
    <DashboardHeader title="Blog & articles"
      description="Write articles, add photos and choose when they go live. Drafts stay private until you publish."
      actions={<>
        <a href="/blog" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <ExternalLink size={14} aria-hidden/> View blog
        </a>
        {newButton}
      </>}/>

    <KpiRow>
      <KpiCard label="Total" value={loading&&!items.length?'—':counts.all} icon={<FileText size={16}/>}/>
      <KpiCard label="Published" value={loading&&!items.length?'—':counts.published} tone="positive" hint="Live on the website"/>
      <KpiCard label="Drafts" value={loading&&!items.length?'—':counts.draft} tone="warning" hint="Only admins can see these"/>
      <KpiCard label="Archived" value={loading&&!items.length?'—':counts.archived} hint="Hidden from the website"/>
    </KpiRow>

    <Panel title="Articles" bodyClassName="p-0"
      actions={<Segmented size="sm" label="Filter by status" value={status} onChange={setStatus} options={[
        {value:'all',label:`All ${counts.all}`},
        {value:'published',label:`Published ${counts.published}`},
        {value:'draft',label:`Drafts ${counts.draft}`},
        {value:'archived',label:`Archived ${counts.archived}`},
      ]}/>}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-4 py-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Search articles</span>
          <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]"/>
          <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by title or URL"
            className={cn(fieldClass,'pl-9')}/>
        </label>
        {loading&&items.length>0&&<Loader2 size={15} aria-label="Updating" className="animate-spin text-[#adb5bd]"/>}
      </div>

      {error&&<div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
        <span>{error}</span>
        <DashButton tone="danger" onClick={()=>void load()}><RefreshCw size={13}/> Retry</DashButton>
      </div>}

      {loading&&!items.length?<ul aria-label="Loading articles" className="divide-y divide-[#f0f0f0]">
        {[0,1,2].map(i=><li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="size-12 animate-pulse rounded-md bg-[#f1f3f5]"/>
          <div className="flex-1 space-y-2"><div className="h-3.5 w-1/2 animate-pulse rounded bg-[#f1f3f5]"/><div className="h-3 w-1/4 animate-pulse rounded bg-[#f1f3f5]"/></div>
        </li>)}
      </ul>
      :rows.length===0?<div className="px-4 py-14 text-center">
        <FileText size={32} aria-hidden className="mx-auto text-rose-200"/>
        {filtering?<>
          <p className="mt-3 text-[14px] font-semibold">No articles match</p>
          <p className="mt-1 text-[13px] text-[#6c757d]">Try another word, or show every status.</p>
          <DashButton className="mt-4" onClick={()=>{setQuery('');setStatus('all');}}><X size={14}/> Clear filters</DashButton>
        </>:<>
          <p className="mt-3 text-[14px] font-semibold">No articles yet</p>
          <p className="mt-1 text-[13px] text-[#6c757d]">Write the first one. It stays a private draft until you publish it.</p>
          <div className="mt-4 flex justify-center">{newButton}</div>
        </>}
      </div>
      :<>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              <PlainHeader label="Article" className="pl-4"/>
              <PlainHeader label="Category"/>
              <PlainHeader label="Status"/>
              <PlainHeader label="Updated"/>
              <PlainHeader label="" className="pr-4"/>
            </tr></thead>
            <tbody>{rows.map(item=><tr key={item.id} className="group border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafbfc]">
              <td className="py-2.5 pl-4 pr-3">
                <Link href={editHref(item.id)} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-rose-600">
                  <Cover item={item} className="size-12"/>
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-semibold text-[#212529] group-hover:text-rose-700">{item.title||'Untitled draft'}</span>
                    <span className="block truncate font-mono text-[11px] text-[#868e96]">/blog/{item.slug}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2.5 text-[#495057]">{item.category||'General'}</td>
              <td className="px-3 py-2.5"><StatusPill tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusPill></td>
              <td className="whitespace-nowrap px-3 py-2.5 text-[#6c757d]" title={new Date(item.updatedAt).toLocaleString()}>{formatWhen(item.updatedAt)}</td>
              <td className="py-2.5 pl-3 pr-4">
                <div className="flex items-center justify-end gap-1">
                  <LiveLink item={item}/>
                  <Link href={editHref(item.id)} className="inline-flex items-center gap-1 rounded-md border border-[#dee2e6] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#212529] hover:bg-[#f1f3f5]">
                    <PenLine size={13} aria-hidden/> Edit
                  </Link>
                </div>
              </td>
            </tr>)}</tbody>
          </table>
        </div>

        <ul className="divide-y divide-[#f0f0f0] md:hidden">
          {rows.map(item=><li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={editHref(item.id)} className="flex min-w-0 flex-1 items-center gap-3">
              <Cover item={item} className="size-14"/>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[14px] font-semibold leading-5 text-[#212529]">{item.title||'Untitled draft'}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6c757d]">
                  <StatusPill tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusPill>
                  <span>{item.category||'General'}</span>
                  <span>{formatWhen(item.updatedAt)}</span>
                </span>
              </span>
            </Link>
            <LiveLink item={item}/>
          </li>)}
        </ul>
      </>}
    </Panel>
    <BlogCategoryManager categories={categories} refresh={refreshCategories}/>
  </DashboardPage>;
}
