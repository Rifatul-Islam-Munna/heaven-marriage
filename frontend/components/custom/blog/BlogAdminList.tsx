'use client';
import type {Route} from 'next';
import {useCallback,useEffect,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,BookOpen,FileText,Loader2,Plus,Search,ShieldCheck} from 'lucide-react';
import type {BlogAdminRow} from '@/lib/blog-types';

export default function BlogAdminList(){
  const router=useRouter();
  const [items,setItems]=useState<BlogAdminRow[]>([]);
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('all');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    try{
      const r=await fetch('/api/blog/admin?q='+encodeURIComponent(query),{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw Error(data.message||'Blog list unavailable');
      setItems(data.items||[]);
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'Could not load blog posts');}
    finally{setLoading(false);}
  },[query]);
  useEffect(()=>{void load();},[load]);
  async function create(){
    setBusy(true);setError('');
    try{
      const r=await fetch('/api/blog/admin',{method:'POST',
        headers:{'Content-Type':'application/json'},body:'{}'});
      const result=await r.json();
      if(!r.ok)throw Error(result.message||'Could not create post');
      router.push(('/dashboard/blog/'+result.id) as Route);
    }catch(e){setError(e instanceof Error?e.message:'Could not create post');setBusy(false);}
  }
  const filtered=items.filter(item=>status==='all'||item.status===status);
  return <main className="min-h-screen bg-[#fbf8f8] px-5 py-8 text-[#30232c] md:px-8">
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-[#2b1d27] px-7 py-9 text-white md:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-rose-400/20 blur-3xl"/>
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f4b7ca]"><BookOpen size={16}/> Niqaha · Editorial Studio</p>
            <h1 className="font-serif text-4xl font-semibold md:text-5xl">Stories worth sharing.</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">Create thoughtful articles, upload beautiful photos, control search previews and publish when everything is ready.</p>
          </div>
          <button type="button" disabled={busy} onClick={()=>void create()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f6afc1] px-5 py-3.5 text-sm font-bold text-[#30202a] shadow-sm transition hover:bg-white disabled:opacity-50">
            {busy?<Loader2 size={18} className="animate-spin"/>:<Plus size={18}/>} New article
          </button>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1.5">{items.length} articles</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">{items.filter(x=>x.status==='published').length} live</span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><ShieldCheck size={14}/> Admin-only editor</span>
        </div>
      </header>
      <section className="rounded-2xl border border-[#eee1e5] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-serif text-2xl font-semibold">Manage articles</h2>
            <p className="mt-1 text-sm text-[#927986]">Drafts stay private. Publishing makes an article visible on the website and in Google-friendly feeds.</p></div>
          <Link href="/blog" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">View public blog <ArrowUpRight size={15}/></Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#f1e7eb] pt-5">
          <label className="relative min-w-[210px] flex-1"><span className="sr-only">Search posts</span><Search size={17} className="absolute left-3 top-3.5 text-[#b49ba6]"/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles and URLs..." className="w-full rounded-xl border border-[#eee0e5] py-3 pl-10 pr-4 text-sm outline-rose-500"/></label>
          <div className="flex flex-wrap gap-2">{['all','draft','published','archived'].map(s=><button key={s} type="button" onClick={()=>setStatus(s)}
            className={'rounded-xl px-4 py-2 text-xs font-semibold capitalize '+(status===s?'bg-[#432b39] text-white':'bg-[#faf3f6] text-[#8c6677] hover:bg-rose-100')}>{s}</button>)}</div>
        </div>
        {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading?<div className="flex items-center justify-center gap-3 py-20 text-[#a58e9a]"><Loader2 className="animate-spin"/> Loading articles...</div>:
          filtered.length===0?<div className="py-20 text-center"><FileText size={44} className="mx-auto text-rose-200"/>
            <h3 className="mt-4 font-serif text-2xl font-semibold">No articles in this view</h3>
            <p className="mt-2 text-sm text-[#967f89]">Create your first post or change the search filters.</p></div>:
            <div className="mt-5 divide-y divide-rose-100">{filtered.map(item=><Link key={item.id}
              href={('/dashboard/blog/'+item.id) as Route} className="group flex items-center gap-4 py-4 hover:bg-rose-50/40">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-rose-50 md:size-20">
                {item.cover?.url?<Image src={item.cover.url} alt={item.cover.alt||item.title} unoptimized fill sizes="80px" className="object-cover"/>:
                  <BookOpen size={27} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-300"/>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-base font-bold text-[#35232e] group-hover:text-rose-700">{item.title||'Untitled draft'}</p>
                <p className="mt-1 truncate font-mono text-xs text-[#a18c96]">/blog/{item.slug}</p>
                <p className="mt-2 text-xs text-[#9b7f8b]">{item.category||'General'} · Updated {new Date(item.updatedAt).toLocaleDateString('en-BD')}</p>
              </div>
              <span className={'hidden rounded-full px-3 py-1 text-xs font-bold capitalize sm:block '+
                (item.status==='published'?'bg-emerald-50 text-emerald-700':item.status==='archived'?'bg-gray-100 text-gray-600':'bg-amber-50 text-amber-700')}>{item.status}</span>
              <ArrowUpRight size={18} className="shrink-0 text-rose-700"/>
            </Link>)}</div>}
      </section>
    </div>
  </main>;
}
