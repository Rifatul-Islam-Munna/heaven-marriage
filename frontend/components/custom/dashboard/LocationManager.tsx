'use client';
import {useMemo,useState} from 'react';
import {toast} from 'sonner';
import {useQueryClient} from '@tanstack/react-query';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import {PostRequestAxios,PatchRequestAxios,DeleteRequestAxios} from '@/api-hooks/api-hooks';
import {districts} from '@/staticData/districts';
import {upazilas} from '@/staticData/upazilas';
import {defaultCityCorporations,defaultCityAreas,defaultMunicipalityUpazilas,defaultMunicipalityAreas,type LocationEntry,type LocationKind,type LocationResponse} from '@/lib/location-options';
import {MapPin,Plus,Save,Loader2,Pencil,Trash2,Search,ChevronLeft,ChevronRight,X,RotateCcw} from 'lucide-react';
import {AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
const kindLabels:Record<LocationKind,string>={country:'Country',district:'District',upazila:'Upazila',
 cityCorporation:'City Corporation',area:'Area / Ward / Neighborhood'};
const types:LocationKind[]=['country','district','upazila','cityCorporation','area'];
const selectStyle='w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-pink-400 focus:outline-none';
function unique(items:string[]){return [...new Set(items.filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
export default function LocationManager(){
 const queryClient=useQueryClient();
 const {data,isPending,isError,refetch}=useQueryWrapper<LocationResponse>(['admin-location-options'],
  '/profile-questions/admin/locations',{staleTime:30000});
 const entries=useMemo(()=>data?.entries||[],[data?.entries]);
 const [kind,setKind]=useState<LocationKind>('area');
 const [district,setDistrict]=useState('Dhaka');
 const [city,setCity]=useState('Dhaka North City Corporation');
 const [upazila,setUpazila]=useState('');
 const [parentArea,setParentArea]=useState('');
 const [areaParent,setAreaParent]=useState<'city'|'upazila'>('city');
 const [name,setName]=useState('');
 const [label,setLabel]=useState('');
 const [busy,setBusy]=useState(false);
 const [showForm,setShowForm]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [editingLabel,setEditingLabel]=useState('');
 const [listSearch,setListSearch]=useState('');
 const [listKind,setListKind]=useState<LocationKind|'all'>('all');
 const [listDistrict,setListDistrict]=useState('all');
 const [listStatus,setListStatus]=useState<'all'|'active'|'hidden'>('all');
 const [listPage,setListPage]=useState(1);
 const [pageSize,setPageSize]=useState(10);
 const [deleteTarget,setDeleteTarget]=useState<LocationEntry|null>(null);
 const visibleCount=entries.filter(x=>x.enabled!==false).length;
 const listDistricts=useMemo(()=>unique(entries.map(x=>x.district||'').filter(Boolean)),[entries]);
 const filteredEntries=useMemo(()=>{
   const query=listSearch.trim().toLocaleLowerCase();
   return entries.filter(x=>
     (listKind==='all'||x.kind===listKind) &&
     (listDistrict==='all'||x.district===listDistrict) &&
     (listStatus==='all'||(listStatus==='active'?x.enabled!==false:x.enabled===false)) &&
     (!query||[x.label,x.name,x.district,x.cityCorporation,x.upazila,x.parentArea,kindLabels[x.kind]].some(v=>String(v||'').toLocaleLowerCase().includes(query)))
   );
 },[entries,listSearch,listKind,listDistrict,listStatus]);
 const pages=Math.max(1,Math.ceil(filteredEntries.length/pageSize));
 const actualPage=Math.min(listPage,pages);
 const shownEntries=filteredEntries.slice((actualPage-1)*pageSize,actualPage*pageSize);
 const changeFilter=()=>setListPage(1);
 const districtNames=useMemo(()=>unique([...districts.map(x=>x.name),...entries.filter(x=>x.kind==='district'&&x.enabled!==false).map(x=>x.name)]),[entries]);
 const cities=useMemo(()=>unique([...defaultCityCorporations,...entries.filter(x=>x.kind==='cityCorporation'&&x.enabled!==false)]
  .filter(x=>x.district===district).map(x=>x.name)),[entries,district]);
 const selectedDistrict=districts.find(d=>d.name===district);
 const localUpazilas=useMemo(()=>unique([...upazilas.filter(u=>u.district_id===selectedDistrict?.id).map(u=>u.name),
  ...defaultMunicipalityUpazilas.filter(u=>u.district===district).map(u=>u.name),
  ...entries.filter(x=>x.kind==='upazila'&&x.district===district&&x.enabled!==false).map(x=>x.name)]),[entries,district,selectedDistrict?.id]);
 const parentAreas=useMemo(()=>unique([...defaultCityAreas,...entries.filter(x=>x.kind==='area'&&x.enabled!==false)]
   .filter(x=>x.district===district && !x.parentArea &&
     (areaParent==='city'?x.cityCorporation===city:x.upazila===upazila)).map(x=>x.name)),
   [entries,district,areaParent,city,upazila]);
 const refresh=()=>{void queryClient.invalidateQueries({queryKey:['admin-location-options']});
  void queryClient.invalidateQueries({queryKey:['public-location-options']});};
 const add=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!name.trim()||busy)return;
  setBusy(true);
  const payload:LocationEntry={kind,name:name.trim(),label:(label.trim()||name.trim()),
    ...(kind==='upazila'||kind==='cityCorporation'||kind==='area'?{district}:{}),
    ...(kind==='area'?areaParent==='city'?{cityCorporation:city}:{upazila}:{}),
    ...(kind==='area'&&parentArea?{parentArea}:{}),
  };
  try{
   const [result,error]=await PostRequestAxios('/profile-questions/admin/locations',payload);
   if(error||!result)throw Error(error?.message||'Could not add location');
   toast.success('নতুন লোকেশন সংরক্ষিত — সদস্যদের ড্রপডাউনে দেখা যাবে');
   setName('');setLabel('');setParentArea('');refresh();
  }catch(error){toast.error(error instanceof Error?error.message:'Save failed');}finally{setBusy(false);}
 };
 const saveEdit=async(id:string,change:{label?:string;enabled?:boolean})=>{
  setBusy(true);
  try{
   const [result,error]=await PatchRequestAxios('/profile-questions/admin/locations/'+id,change);
   if(error||!result)throw Error(error?.message||'Update failed');
   setEditing(null);toast.success('লোকেশন আপডেট হয়েছে');refresh();
  }catch(error){toast.error(error instanceof Error?error.message:'Update failed');}finally{setBusy(false);}
 }
 const remove=async()=>{
   if(!deleteTarget?._id||busy)return;
   const id=deleteTarget._id;
   setBusy(true);
   try{
     const [result,error]=await DeleteRequestAxios<{message:string}>('/profile-questions/admin/locations/'+encodeURIComponent(id));
     if(error||!result)throw Error(error?.message||'Could not delete location');
     toast.success('লোকেশন স্থায়ীভাবে মুছে ফেলা হয়েছে');
     if(editing===id)setEditing(null);
     setDeleteTarget(null);
     refresh();
   }catch(error){toast.error(error instanceof Error?error.message:'Delete failed');}
   finally{setBusy(false);}
 };;
 return <section id="location-manager" className="scroll-mt-24 space-y-4 rounded-xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
   <header className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><MapPin className="size-5 text-pink-600"/> Country, City & Area Manager</h2>
     <p className="mt-1 text-sm text-gray-600">
       সরকারি ১৩টি City Corporation এবং ৬৪ জেলার জন্য পৌরসভা/উপজেলা তালিকা রাখা হয়েছে।
       পুরোনো লোকেশন অক্ষত আছে; নতুন এলাকা বা Ward প্রশাসক নিজেই যোগ করতে পারবেন।
     </p>
     <p className="mt-1 text-xs text-slate-500">
       পৌরসভা একটি Urban Municipality, City Corporation নয়। {defaultCityCorporations.length}টি গেজেটভুক্ত
       সিটি কর্পোরেশন ও {defaultMunicipalityAreas.length}টি পৌরসভা-এন্ট্রি রয়েছে।
       পৌরসভার ডেটা একটি ওপেন ডেটাসেট থেকে সংকলিত; Admin নাম ও সীমানা যাচাই করুন।
     </p>
     <p className="mt-1 text-xs font-medium text-pink-700">এখানে Add করলে সঙ্গে সঙ্গেই তালিকায় যাবে। Question Builder-এর প্রশ্ন পরিবর্তন করতে আলাদাভাবে Save & Publish করতে হবে।</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={()=>setShowForm(value=>!value)}
        aria-expanded={showForm} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
        {showForm?<X size={16}/>:<Plus size={16}/>} {showForm?'ফর্ম বন্ধ করুন':'নতুন লোকেশন যোগ করুন'}
      </button>
      <button type="button" onClick={()=>void refetch()} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">তালিকা রিফ্রেশ</button>
    </div>
   </header>
   {showForm&&<form onSubmit={add} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
    <label className="space-y-1 text-sm font-medium">কী যোগ করবেন?
      <select className={selectStyle} value={kind} onChange={e=>setKind(e.target.value as LocationKind)}>
       {types.map(t=><option key={t} value={t}>{kindLabels[t]}</option>)}
      </select>
    </label>
    {['upazila','cityCorporation','area'].includes(kind)&&<label className="space-y-1 text-sm font-medium">জেলা
     <select className={selectStyle} value={district} onChange={e=>{
       const next=e.target.value;
       setDistrict(next);setCity('');setUpazila('');setParentArea('');
       if(![...defaultCityCorporations,...entries.filter(x=>x.kind==='cityCorporation')].some(x=>x.district===next))
         setAreaParent('upazila');
     }}>
      {districtNames.map(x=><option key={x} value={x}>{x}</option>)}
     </select></label>}
    {kind==='area'&&<label className="space-y-1 text-sm font-medium">এলাকাটি কোথায়?
     <select className={selectStyle} value={areaParent} onChange={e=>{setAreaParent(e.target.value as 'city'|'upazila');setParentArea('');}}> 
      <option value="city" disabled={!cities.length}>City Corporation-এর ভিতরে</option>
      <option value="upazila">উপজেলা / পৌরসভার ভিতরে</option>
     </select></label>}
    {kind==='area'&&areaParent==='city'&&<label className="space-y-1 text-sm font-medium">City Corporation
     <select className={selectStyle} required value={cities.includes(city)?city:''} onChange={e=>{setCity(e.target.value);setParentArea('');}}> 
       <option value="">সিটি কর্পোরেশন নির্বাচন</option>{cities.map(x=><option key={x} value={x}>{x}</option>)}
     </select></label>}
    {kind==='area'&&areaParent==='upazila'&&<label className="space-y-1 text-sm font-medium">Upazila
     <select className={selectStyle} required value={upazila} onChange={e=>{setUpazila(e.target.value);setParentArea('');}}> 
       <option value="">উপজেলা নির্বাচন</option>{localUpazilas.map(x=><option key={x} value={x}>{x}</option>)}
     </select></label>}
    {kind==='area'&&<label className="space-y-1 text-sm font-medium">
      আরও ভিতরের এলাকা / ওয়ার্ড যোগ করবেন? (ঐচ্ছিক)
      <select className={selectStyle} value={parentArea} onChange={e=>setParentArea(e.target.value)}>
        <option value="">সরাসরি উপজেলা / সিটির নিচে</option>
        {parentAreas.map(name=><option key={name} value={name}>{name} → ভিতরের ওয়ার্ড/মহল্লা</option>)}
      </select>
      <span className="block text-[11px] font-normal text-slate-500">যেমন: Sadar → Pourashava → Ward 3; অথবা Dhaka North → Gulshan → Road 10</span>
    </label>}
    <label className="space-y-1 text-sm font-medium">নাম (stored value)
     <input className={selectStyle} value={name} onChange={e=>setName(e.target.value)} required maxLength={120}
       placeholder={kind==='area'?'যেমন: Gulshan / Ward 12':'English name'}/></label>
    <label className="space-y-1 text-sm font-medium">দেখানোর নাম (ঐচ্ছিক)
     <input className={selectStyle} value={label} onChange={e=>setLabel(e.target.value)} maxLength={120}
       placeholder="ফাঁকা রাখলে নামই দেখা যাবে"/></label>
    <button disabled={busy||!name.trim()||(kind==='area'&&!(areaParent==='city'?cities.includes(city):upazila))}
     className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50 md:col-span-2">
     {busy?<Loader2 size={16} className="animate-spin"/>:<Plus size={16}/>} লোকেশন যোগ ও সংরক্ষণ করুন
    </button>
   </form>}
   <section aria-labelledby="managed-locations-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 id="managed-locations-title" className="text-base font-bold text-slate-900">সংরক্ষিত কাস্টম লোকেশন</h3>
        <p className="mt-1 text-xs text-slate-600">{entries.length}টি লোকেশন · {visibleCount}টি চালু · {entries.length-visibleCount}টি লুকানো</p>
      </div>
      <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-700">শুধু Admin-added entries</span>
    </div>

    <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(140px,1fr)]">
      <label className="relative min-w-0">
        <span className="sr-only">লোকেশন খুঁজুন</span>
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input type="search" value={listSearch} onChange={e=>{setListSearch(e.target.value);changeFilter();}}
          placeholder="নাম, জেলা, ওয়ার্ড খুঁজুন..." className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-pink-500"/>
      </label>
      <label><span className="sr-only">লোকেশনের ধরন</span>
        <select value={listKind} onChange={e=>{setListKind(e.target.value as LocationKind|'all');changeFilter();}} className={selectStyle}>
          <option value="all">সব ধরনের লোকেশন</option>{types.map(t=><option key={t} value={t}>{kindLabels[t]}</option>)}
        </select>
      </label>
      <label><span className="sr-only">জেলা ফিল্টার</span>
        <select value={listDistrict} onChange={e=>{setListDistrict(e.target.value);changeFilter();}} className={selectStyle}>
          <option value="all">সব জেলা</option>{listDistricts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label><span className="sr-only">দৃশ্যমানতার ফিল্টার</span>
        <select value={listStatus} onChange={e=>{setListStatus(e.target.value as 'all'|'active'|'hidden');changeFilter();}} className={selectStyle}>
          <option value="all">সব স্ট্যাটাস</option><option value="active">চালু</option><option value="hidden">লুকানো</option>
        </select>
      </label>
    </div>

    {isPending&&<p role="status" className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600"><Loader2 size={17} className="mr-2 inline animate-spin"/>লোকেশন লোড হচ্ছে...</p>}
    {isError&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      লোকেশন লোড করা যায়নি। <button type="button" className="font-bold underline" onClick={()=>void refetch()}>আবার চেষ্টা করুন</button>
    </div>}
    {!isPending&&!isError&&<div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_110px_225px] lg:gap-3">
        <span>লোকেশন</span><span>এলাকার অবস্থান</span><span>স্ট্যাটাস</span><span className="text-right">অ্যাকশন</span>
      </div>
      <div className="divide-y divide-slate-100">
        {shownEntries.map(x=><div key={String(x._id)} className="grid min-w-0 gap-3 bg-white px-3 py-3.5 transition-colors hover:bg-pink-50/30 sm:px-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_110px_225px] lg:items-center">
          <div className="min-w-0 space-y-1">
            <p className="break-words text-sm font-bold text-slate-900">{x.label||x.name}</p>
            <p className="text-xs text-pink-700">{kindLabels[x.kind]}</p>
            {x.label!==x.name&&<p className="break-all text-[11px] text-slate-500">Stored value: {x.name}</p>}
            {editing===String(x._id)&&<div className="flex flex-wrap items-center gap-2 pt-2">
              <label className="min-w-[150px] flex-1"><span className="sr-only">নতুন দেখানোর নাম</span>
                <input autoFocus value={editingLabel} maxLength={120} onChange={e=>setEditingLabel(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-pink-300 bg-white px-3 text-sm focus:outline-2 focus:outline-pink-500"/>
              </label>
              <button type="button" disabled={busy||!editingLabel.trim()} onClick={()=>void saveEdit(String(x._id),{label:editingLabel})}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-pink-600 px-3 text-xs font-bold text-white hover:bg-pink-700 disabled:opacity-50">
                <Save size={15}/> সংরক্ষণ
              </button>
              <button type="button" disabled={busy} onClick={()=>setEditing(null)} aria-label="এডিট বাতিল করুন"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><X size={16}/></button>
            </div>}
          </div>
          <p className="min-w-0 break-words text-xs leading-5 text-slate-600">
            {[x.district,x.cityCorporation||x.upazila,x.parentArea].filter(Boolean).join(' → ')||'—'}
          </p>
          <div><span className={x.enabled===false
            ?'inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'
            :'inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'}>
            {x.enabled===false?'লুকানো':'চালু'}
          </span></div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {x.enabled===false&&<button type="button" disabled={busy} onClick={()=>void saveEdit(String(x._id),{enabled:true})}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <RotateCcw size={14}/> দেখান
            </button>}
            <button type="button" disabled={busy||editing===String(x._id)} onClick={()=>{setEditing(String(x._id));setEditingLabel(x.label||x.name);}}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              <Pencil size={14}/> এডিট
            </button>
            <button type="button" disabled={busy} onClick={()=>setDeleteTarget(x)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 hover:border-rose-400 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-50">
              <Trash2 size={14}/> ডিলিট
            </button>
          </div>
        </div>)}
        {!shownEntries.length&&<div className="space-y-3 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">{!entries.length?'এখনও কোনো কাস্টম লোকেশন নেই।':'এই ফিল্টারে কোনো লোকেশন পাওয়া যায়নি।'}</p>
          {!!entries.length&&<button type="button" onClick={()=>{setListSearch('');setListKind('all');setListDistrict('all');setListStatus('all');setListPage(1);}} className="text-sm font-semibold text-pink-700 underline">ফিল্টার মুছুন</button>}
        </div>}
      </div>
    </div>}
    {!isPending&&!isError&&<footer className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-600">{filteredEntries.length?((actualPage-1)*pageSize+1)+'–'+Math.min(actualPage*pageSize,filteredEntries.length)+' / '+filteredEntries.length:'০টি'} লোকেশন</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">প্রতি পেজ
          <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setListPage(1);}} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm">
            {[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" onClick={()=>setListPage(n=>Math.max(1,n-1))} disabled={actualPage<=1}
          aria-label="আগের পেজ" className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronLeft size={18}/></button>
        <span className="min-w-14 text-center text-xs font-semibold text-slate-700">{actualPage} / {pages}</span>
        <button type="button" onClick={()=>setListPage(n=>Math.min(pages,n+1))} disabled={actualPage>=pages}
          aria-label="পরের পেজ" className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight size={18}/></button>
      </div>
    </footer>}
   </section>

   <AlertDialog open={!!deleteTarget} onOpenChange={open=>{if(!open&&!busy)setDeleteTarget(null);}}>
     <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
       <AlertDialogHeader>
         <AlertDialogTitle className="flex items-center gap-2 text-slate-900"><Trash2 className="size-5 text-rose-600"/> লোকেশন স্থায়ীভাবে ডিলিট করবেন?</AlertDialogTitle>
         <AlertDialogDescription className="space-y-2 text-sm leading-6">
           <span className="block break-words font-semibold text-slate-900">{deleteTarget?.label||deleteTarget?.name}</span>
           <span className="block">এই কাস্টম লোকেশনটি ড্রপডাউন থেকে মুছে যাবে; এটি শুধু Hide করা নয়। আগে জমা দেওয়া সদস্যের বায়োডাটার উত্তর পরিবর্তন হবে না।</span>
           <span className="block font-medium text-rose-700">ডিলিট করার পর আগের এন্ট্রিটি ফেরত আনা যাবে না।</span>
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel disabled={busy}>বাতিল</AlertDialogCancel>
         <button type="button" disabled={busy} onClick={()=>void remove()}
           className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-60">
           {busy?<Loader2 size={16} className="animate-spin"/>:<Trash2 size={16}/>} স্থায়ীভাবে ডিলিট করুন
         </button>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
  </section>;
}
