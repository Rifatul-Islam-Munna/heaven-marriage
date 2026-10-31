'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {BarChart3,CheckCircle2,Code2,ExternalLink,FileSearch,Globe,Image as ImageIcon,LockKeyhole,RefreshCcw,Save,Search,Send,Settings2,ShieldCheck} from 'lucide-react';
import {visualPageCatalog} from '@/lib/visual-page-catalog';
import {SITE_ORIGIN,isPrivateSeoPath,validSeoPath,type SeoAdminDoc,type SeoListItem,type SeoSettings} from '@/lib/seo-settings-types';

type Tab='basics'|'social'|'indexing'|'schema'|'site';
type Group='robots'|'openGraph'|'twitter'|'sitemap'|'verification';
const cls='w-full rounded-xl border border-[#e8dbe0] bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';
function Field({name,children,hint}:{name:string;children:React.ReactNode;hint?:string}){
  return <label className="block space-y-1.5"><span className="block text-xs font-bold text-[#56414c]">{name}</span>
    {children}{hint&&<span className="block text-[11px] leading-5 text-[#97838d]">{hint}</span>}</label>;
}
function TextField({name,value,onChange,hint,placeholder='',multiline=false}:{name:string;value:string;onChange:(v:string)=>void;hint?:string;placeholder?:string;multiline?:boolean}){
  return <Field name={name} hint={hint}>{multiline?
    <textarea dir="auto" rows={3} className={cls+' resize-y'} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>:
    <input dir="auto" className={cls} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>}</Field>;
}
function Toggle({label,checked,onChange,disabled=false,help}:{label:string;checked:boolean;onChange:(v:boolean)=>void;disabled?:boolean;help?:string}){
  return <label className="flex items-center justify-between gap-4 rounded-xl border border-[#eee4e7] p-3.5">
    <span><span className="block text-sm font-semibold">{label}</span>{help&&<span className="mt-1 block text-xs text-[#96818d]">{help}</span>}</span>
    <input aria-label={label} type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)} className="size-4 shrink-0 accent-rose-600"/>
  </label>;
}
function parseLanguages(source:string){
  const result:Record<string,string>={};
  for(const line of source.split('\n').map(v=>v.trim()).filter(Boolean)){
    const m=line.match(/^([a-z]{2,3}(?:-[a-zA-Z]{2,4})?|x-default):\s*(.+)$/);
    if(m)result[m[1]]=m[2].trim();
  }
  return result;
}
const languageText=(v?:Record<string,string>)=>Object.entries(v||{}).map(([k,x])=>k+': '+x).join('\n');
const tabs:[Tab,string,typeof Search][]=[
  ['basics','Search basics',FileSearch],['social','Social cards',ImageIcon],
  ['indexing','Index & sitemap',Globe],['schema','Schema / Hreflang',Code2],['site','Global settings',Settings2],
];

export default function SeoManager(){
  const [scope,setScope]=useState('/');
  const [query,setQuery]=useState('');
  const [custom,setCustom]=useState('');
  const [tab,setTab]=useState<Tab>('basics');
  const [doc,setDoc]=useState<SeoAdminDoc|null>(null);
  const [form,setForm]=useState<SeoSettings>({});
  const [saved,setSaved]=useState<SeoListItem[]>([]);
  const [langInput,setLangInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const isPrivate=isPrivateSeoPath(scope);
  const available=useMemo(()=>visualPageCatalog.filter(x=>x.path.toLowerCase().includes(query.toLowerCase())||
    x.label.toLowerCase().includes(query.toLowerCase())),[query]);
  const pageStatus=saved.find(x=>x.scope===scope);
  const tabsShown=tabs.filter(x=>scope==='@site'?x[0]==='site'||x[0]==='schema':x[0]!=='site');
  const languageDirty=scope!=='@site'&&langInput!==languageText(doc?.draft.languages);
  const dirty=JSON.stringify(form)!==JSON.stringify(doc?.draft||{})||languageDirty;
  const siteTitle=form.title||visualPageCatalog.find(x=>x.path===scope)?.label+' | Niqaha.com'||'Niqaha.com';
  const siteDescription=form.description||'The existing page description remains the fallback.';
  const url=scope==='@site'?SITE_ORIGIN:form.canonical||SITE_ORIGIN+(scope==='/'?'':scope);

  const reloadList=useCallback(async()=>{
    try{const response=await fetch('/api/seo-settings?list=1',{cache:'no-store'});
      if(response.ok)setSaved(await response.json() as SeoListItem[]);}catch{}
  },[]);
  useEffect(()=>{void reloadList();},[reloadList]);
  useEffect(()=>{
    const chosen=new URLSearchParams(window.location.search).get('path');
    if(chosen&&validSeoPath(chosen))setScope(chosen);
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    setDoc(null);setForm({});setLangInput('');setError('');setMessage('');
    void (async()=>{
      try{
        const response=await fetch('/api/seo-settings?admin=1&path='+encodeURIComponent(scope),
          {cache:'no-store',signal:controller.signal});
        if(!response.ok)throw Error((await response.json()).message||'Unable to load SEO content');
        const next=await response.json() as SeoAdminDoc;
        if(controller.signal.aborted)return;
        setDoc(next);setForm(next.draft);setLangInput(languageText(next.draft.languages));
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Loading failed');}
    })();
    return ()=>controller.abort();
  },[scope]);
  const change=(key:keyof SeoSettings,value:unknown)=>
    setForm(prev=>({...prev,[key]:value}));
  const nested=(group:Group,key:string,value:string|number|boolean|undefined)=>
    setForm(prev=>({...prev,[group]:{...(prev[group]||{}),[key]:value}}));
  const pick=(path:string)=>{
    setScope(path);setTab(path==='@site'?'site':'basics');
    setError('');setMessage('');
  };
  const chooseCustom=()=>{
    let path=custom.trim();
    if(/^https?:\/\//.test(path)){
      try{
        const u=new URL(path);
        if(u.origin!==SITE_ORIGIN&&u.origin!==window.location.origin)throw Error();
        path=u.pathname;
      }catch{setError('Use a Niqaha.com page URL, not an external website.');return;}
    }
    path=path==='/'?path:path.replace(/\/$/,'');
    if(!validSeoPath(path)||path==='@site'){setError('Enter a valid path such as /policies/privacy.');return;}
    pick(path);
  };
  async function save(){
    if(!doc||busy)return;
    setBusy(true);setError('');setMessage('');
    try{
      if(form.structuredData?.trim())JSON.parse(form.structuredData);
      const langs=parseLanguages(langInput);
      if(scope!=='@site'&&langInput.split('\n').filter(x=>x.trim()).length!==Object.keys(langs).length)
        throw Error('Hreflang requires one language: URL on each line.');
      const settings={...form,...(scope==='@site'?{}:{languages:langs})};
      const response=await fetch('/api/seo-settings',{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({scope,revision:doc.revision,settings}),
      });
      const payload=await response.json();
      if(!response.ok)throw Error(payload.message||'Unable to save SEO');
      setDoc(payload);setForm(payload.draft);setLangInput(languageText(payload.draft.languages));
      setMessage('Draft saved to MongoDB. Publish to make your SEO changes live.');
      await reloadList();
    }catch(e){setError(e instanceof Error?e.message:'Save failed');}
    finally{setBusy(false);}
  }
  async function publish(){
    if(!doc||busy)return;
    if(dirty){setError('Save your changes first, then publish.');return;}
    if(!window.confirm('Publish SEO settings for '+scope+'?'))return;
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/seo-settings',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({scope,revision:doc.revision}),
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.message||'Publish failed');
      setDoc(result);setMessage('Published! Search metadata and sitemap caches invalidated.');
      await reloadList();
    }catch(e){setError(e instanceof Error?e.message:'Publish failed');}
    finally{setBusy(false);}
  }
  return <div className="min-h-screen bg-[#fbf8f8] px-4 py-7 text-[#2e232b] md:px-7 md:py-9">
    <div className="mx-auto max-w-[1450px] space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-[#2c1e29] px-7 py-8 text-white md:px-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-80 rounded-full bg-rose-400/20 blur-3xl"/>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-rose-200"><BarChart3 size={16}/> Niqaha · Search visibility studio</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold md:text-5xl">Every page. Every detail.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Edit search snippets, canonical links, social previews, robots, sitemaps and structured data in one place. Your website design stays untouched.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>void save()} disabled={!doc||busy||!dirty} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold hover:bg-white/10 disabled:opacity-35"><Save size={16}/> Save draft</button>
            <button onClick={()=>void publish()} disabled={!doc||busy||dirty||!doc.hasUnpublishedChanges} className="flex items-center gap-2 rounded-xl bg-[#f6a1b6] px-5 py-3 text-xs font-bold text-[#301d28] hover:bg-[#ffd0dc] disabled:opacity-40"><Send size={16}/> Publish</button>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1.5">{visualPageCatalog.length} routes</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">{saved.filter(x=>x.published).length} published settings</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">20-minute server cache</span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><ShieldCheck size={13}/> Admin protected</span>
        </div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(255px,320px)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-[#eee1e5] bg-white shadow-sm">
          <div className="border-b border-[#eee1e5] p-4">
            <p className="text-base font-bold">Your pages <span className="text-xs font-normal text-[#a58c97]">({available.length})</span></p>
            <label className="relative mt-3 block"><Search size={15} className="absolute left-3 top-3.5 text-rose-400"/><input aria-label="Search routes" value={query} onChange={e=>setQuery(e.target.value)} className={cls+' pl-9'} placeholder="Search page titles or URLs"/></label>
          </div>
          <div className="max-h-[550px] space-y-1 overflow-y-auto p-2">
            <button onClick={()=>pick('@site')} className={'flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold '+(scope==='@site'?'border-rose-300 bg-rose-50':'border-transparent hover:bg-[#fbf7f8]')}><Settings2 size={16} className="text-rose-600"/> Global SEO & verification</button>
            {available.map(item=>{
              const savedItem=saved.find(x=>x.scope===item.path);
              return <button key={item.path} onClick={()=>pick(item.path)} className={'w-full rounded-xl border px-3 py-3 text-left '+(item.path===scope?'border-rose-300 bg-rose-50':'border-transparent hover:bg-[#fbf7f8]')}>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {isPrivateSeoPath(item.path)?<LockKeyhole size={13} className="text-[#9f8893]"/>:<FileSearch size={13} className="text-rose-500"/>}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </p>
                <p className="mt-1 truncate pl-5 font-mono text-[11px] text-[#98818b]">{item.path}</p>
                {savedItem&&<p className="mt-1.5 pl-5 text-[11px] text-rose-700">{savedItem.hasUnpublishedChanges?'● Unpublished draft':savedItem.published?'✓ Published':'Draft saved'}</p>}
              </button>;
            })}
          </div>
          <div className="space-y-2 border-t border-[#eee1e5] p-4">
            <p className="text-xs font-semibold">Individual URL or dynamic route</p>
            <div className="flex gap-2">
              <input aria-label="Custom page path" className={cls+' min-w-0 flex-1'} value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')chooseCustom();}} placeholder="/policies/privacy"/>
              <button onClick={chooseCustom} className="rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700">Go</button>
            </div>
            <p className="text-[11px] leading-5 text-[#998891]">For dynamic pages choose a template like /policies/[kind], or enter one exact URL.</p>
          </div>
        </aside>
        <div className="min-w-0 space-y-5">
          <section className="space-y-5 rounded-2xl border border-[#eee1e5] bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-rose-600">Selected SEO configuration</p><h2 className="mt-2 break-all font-mono text-xl font-bold">{scope==='@site'?'Whole site':scope}</h2><p className="mt-1 text-xs text-[#98848c]">Revision {doc?.revision??0} · {pageStatus?.published?'Published before':'Using original metadata'}</p></div>
              {scope!=='@site'&&<a href={scope.includes('[')?'/':scope} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><ExternalLink size={14}/> View page</a>}
            </div>
            {isPrivate&&<p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900"><LockKeyhole className="mt-0.5 shrink-0" size={16}/> Protected account page. Its title can be edited, but it always remains noindex and excluded from the sitemap.</p>}
            {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
            <div className="flex flex-wrap gap-2 border-b border-[#eee1e5] pb-4">
              {tabsShown.map(([key,title,Icon])=><button key={key} onClick={()=>setTab(key)} className={'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold '+(tab===key?'bg-[#382731] text-white':'bg-[#faf5f7] text-[#765966] hover:bg-rose-50')}><Icon size={14}/>{title}</button>)}
            </div>
            {scope!=='@site'&&tab==='basics'&&<div className="grid gap-5">
              <h3 className="font-serif text-2xl font-semibold">Search essentials</h3>
              <TextField name="Meta title" value={form.title||''} onChange={v=>change('title',v)} hint="Write a unique, descriptive title. Search engines may shorten it."/>
              <p className="-mt-4 text-xs text-[#887581]">{(form.title||'').length} characters</p>
              <TextField name="Meta description" multiline value={form.description||''} onChange={v=>change('description',v)} hint="A clear summary of this exact page, not a keyword list."/>
              <p className="-mt-4 text-xs text-[#887581]">{(form.description||'').length} characters</p>
              <TextField name="Keywords (optional)" value={(form.keywords||[]).join(', ')} onChange={v=>change('keywords',v.split(',').map(s=>s.trim()).filter(Boolean))} hint="Comma-separated. Google generally ignores this meta tag."/>
              <TextField name="Canonical URL" value={form.canonical||''} onChange={v=>change('canonical',v)} placeholder={SITE_ORIGIN+scope} hint="Keep blank to use the existing canonical. Only niqaha.com is allowed."/>
              <TextField name="Content author (optional)" value={form.author||''} onChange={v=>change('author',v)}/>
            </div>}
            {scope!=='@site'&&tab==='social'&&<div className="grid gap-5">
              <h3 className="font-serif text-2xl font-semibold">Social sharing previews</h3>
              <p className="text-xs text-[#98818d]">Recommended preview image: roughly 1200 × 630 px. Use a publicly available image URL.</p>
              <h4 className="text-sm font-bold text-rose-700">Open Graph · Facebook, Messenger, LinkedIn</h4>
              <TextField name="OG title" value={form.openGraph?.title||''} onChange={v=>nested('openGraph','title',v)}/>
              <TextField name="OG description" multiline value={form.openGraph?.description||''} onChange={v=>nested('openGraph','description',v)}/>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="OG image URL" value={form.openGraph?.image||''} onChange={v=>nested('openGraph','image',v)} placeholder="/opengraph-image"/>
                <TextField name="OG image description" value={form.openGraph?.imageAlt||''} onChange={v=>nested('openGraph','imageAlt',v)}/>
                <Field name="OG page type"><select className={cls} value={form.openGraph?.type||'website'} onChange={e=>nested('openGraph','type',e.target.value)}><option value="website">Website</option><option value="article">Article</option></select></Field>
                <TextField name="OG language locale" value={form.openGraph?.locale||''} onChange={v=>nested('openGraph','locale',v)} placeholder="bn_BD"/>
              </div>
              <h4 className="border-t border-[#eee1e5] pt-5 text-sm font-bold text-rose-700">X / Twitter card</h4>
              <Field name="Card style"><select className={cls} value={form.twitter?.card||'summary_large_image'} onChange={e=>nested('twitter','card',e.target.value)}><option value="summary_large_image">Large preview</option><option value="summary">Compact preview</option></select></Field>
              <TextField name="X title" value={form.twitter?.title||''} onChange={v=>nested('twitter','title',v)}/>
              <TextField name="X description" multiline value={form.twitter?.description||''} onChange={v=>nested('twitter','description',v)}/>
              <TextField name="X image URL" value={form.twitter?.image||''} onChange={v=>nested('twitter','image',v)}/>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="X site account" value={form.twitter?.site||''} onChange={v=>nested('twitter','site',v)} placeholder="@niqaha"/>
                <TextField name="X creator" value={form.twitter?.creator||''} onChange={v=>nested('twitter','creator',v)}/>
              </div>
            </div>}
            {scope!=='@site'&&tab==='indexing'&&<div className="grid gap-4">
              <h3 className="font-serif text-2xl font-semibold">Indexing and crawling</h3>
              <Toggle label="Allow search indexing" checked={!isPrivate&&form.robots?.index!==false} onChange={v=>nested('robots','index',v)} disabled={isPrivate} help="Controls the noindex directive."/>
              <Toggle label="Follow page links" checked={!isPrivate&&form.robots?.follow!==false} onChange={v=>nested('robots','follow',v)} disabled={isPrivate}/>
              <Toggle label="No text snippet" checked={form.robots?.nosnippet===true} onChange={v=>nested('robots','nosnippet',v)}/>
              <Toggle label="No image index" checked={form.robots?.noimageindex===true} onChange={v=>nested('robots','noimageindex',v)}/>
              <Toggle label="Noarchive (legacy)" checked={form.robots?.noarchive===true} onChange={v=>nested('robots','noarchive',v)}/>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="Maximum snippet length"><input className={cls} type="number" min={-1} max={10000} placeholder="Default" value={form.robots?.maxSnippet??''} onChange={e=>nested('robots','maxSnippet',e.target.value===''?undefined:Number(e.target.value))}/></Field>
                <Field name="Max image preview"><select className={cls} value={form.robots?.maxImagePreview||'large'} onChange={e=>nested('robots','maxImagePreview',e.target.value)}><option value="large">Large</option><option value="standard">Standard</option><option value="none">None</option></select></Field>
              </div>
              <h4 className="border-t border-[#eee1e5] pt-5 text-sm font-bold text-rose-700">XML sitemap</h4>
              <Toggle label="Include in sitemap" checked={!isPrivate&&form.sitemap?.include!==false} disabled={isPrivate} onChange={v=>nested('sitemap','include',v)} help="Only existing public pages are eligible; noindex overrides this."/>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="Change frequency"><select className={cls} value={form.sitemap?.changeFrequency||'monthly'} onChange={e=>nested('sitemap','changeFrequency',e.target.value)}>{['always','hourly','daily','weekly','monthly','yearly','never'].map(v=><option key={v} value={v}>{v}</option>)}</select></Field>
                <Field name="Priority (0–1)"><input className={cls} type="number" step={0.1} min={0} max={1} placeholder="Default" value={form.sitemap?.priority??''} onChange={e=>nested('sitemap','priority',e.target.value===''?undefined:Number(e.target.value))}/></Field>
              </div>
            </div>}
            {tab==='schema'&&<div className="grid gap-4">
              <h3 className="font-serif text-2xl font-semibold">JSON-LD structured data</h3>
              <p className="text-xs leading-6 text-[#947f89]">Add valid schema.org JSON-LD that accurately describes this page. Rich results are not guaranteed, and executable scripts are not accepted.</p>
              <textarea className={cls+' min-h-64 font-mono text-xs leading-6'} spellCheck={false} aria-label="Structured data JSON-LD"
                value={form.structuredData||''} onChange={e=>change('structuredData',e.target.value)}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Niqaha"\n}'}/>
              {form.structuredData?.trim()&&<p className="text-xs">{(()=>{try{JSON.parse(form.structuredData);return '✓ Valid JSON';}catch{return 'Please fix invalid JSON before saving.';}})()}</p>}
              {scope!=='@site'&&<TextField name="Hreflang alternate URLs" multiline value={langInput} onChange={setLangInput} placeholder={'bn: /\nen: /en'} hint="One existing translated equivalent per line, formatted: language: URL. Do not invent translated pages."/>}
            </div>}
            {scope==='@site'&&tab==='site'&&<div className="grid gap-4">
              <h3 className="font-serif text-2xl font-semibold">Site-wide SEO identity</h3>
              <p className="text-xs leading-6 text-[#94808a]">Global settings support every page, alongside the original per-page metadata.</p>
              <TextField name="Brand/site name" value={form.siteName||''} onChange={v=>change('siteName',v)} placeholder="Niqaha.com"/>
              <TextField name="Default social share image URL" value={form.openGraph?.image||''} onChange={v=>nested('openGraph','image',v)} placeholder="/opengraph-image"/>
              <h4 className="border-t border-[#eee1e5] pt-4 text-sm font-bold">Search Console verification</h4>
              <TextField name="Google verification token" value={form.verification?.google||''} onChange={v=>nested('verification','google',v)} hint="Token only. Do not paste the full meta tag."/>
              <TextField name="Bing verification token" value={form.verification?.bing||''} onChange={v=>nested('verification','bing',v)}/>
            </div>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee1e5] pt-5">
              <button onClick={()=>{setForm({});setLangInput('');setMessage('Coded defaults selected. Save and publish to restore them.');}} className="flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><RefreshCcw size={14}/> Restore original defaults</button>
              <div className="flex gap-2">
                <button onClick={()=>void save()} disabled={!doc||busy||!dirty} className="flex items-center gap-1 rounded-lg bg-[#392832] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Save size={15}/> Save</button>
                <button onClick={()=>void publish()} disabled={!doc||busy||dirty||!doc.hasUnpublishedChanges} className="flex items-center gap-1 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Send size={15}/> Publish</button>
              </div>
            </div>
          </section>
          {scope!=='@site'&&<div className="grid gap-5 xl:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-[#eee1e5] bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#886e7a]"><Search size={15}/> Search preview</h3>
              <p className="mt-5 break-all text-xs text-emerald-700">{url}</p>
              <p className="mt-1 line-clamp-2 text-lg font-medium text-[#2156b0]">{siteTitle}</p>
              <p className="mt-1 line-clamp-3 text-sm text-[#6a6570]">{siteDescription}</p>
              <p className="mt-3 text-[11px] text-[#93838d]">Illustrative; Google can change the actual snippet.</p>
            </section>
            <section className="min-w-0 rounded-2xl border border-[#eee1e5] bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#886e7a]"><ImageIcon size={15}/> Share preview</h3>
              <div className="mt-4 overflow-hidden rounded-xl border bg-[#faf6f7]">
                <div className="flex h-24 items-center justify-center bg-[#f0e0e6] text-rose-600">
                  {form.openGraph?.image?<p className="px-3 text-center text-xs">{form.openGraph.image}</p>:<ImageIcon size={28}/>}
                </div>
                <div className="p-3"><p className="text-[10px] font-semibold text-[#95848c]">NIQAHA.COM</p><p className="mt-1 truncate text-sm font-bold">{form.openGraph?.title||siteTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#92848e]">{form.openGraph?.description||siteDescription}</p></div>
              </div>
            </section>
          </div>}
          <p className="flex items-start gap-2 text-xs leading-6 text-[#8c7a86]"><CheckCircle2 size={17} className="mt-1 shrink-0 text-rose-600"/>
            Settings are stored in MongoDB as drafts and published values. No new SEO data is applied to visitors until you publish. Existing metadata and page design remain the fallback.</p>
        </div>
      </div>
    </div>
  </div>;
}
