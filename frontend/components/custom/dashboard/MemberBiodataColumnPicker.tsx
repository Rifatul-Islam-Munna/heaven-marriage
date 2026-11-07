'use client';

import {useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,Check,Columns3,Loader2,Pencil,Plus,Search,Trash2,X} from 'lucide-react';
import {toast} from 'sonner';
import {PatchRequestAxios} from '@/api-hooks/api-hooks';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';

export type BiodataFieldColumn={id:string;label:string;section:string;type:string};
export type ProfileTableColumn={id:string;label:string;questionIds:string[]};
const MAX_COLUMNS=12,MAX_FIELDS=6;
const control='min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

export default function MemberBiodataColumnPicker({
 availableFields,selected,onSaved,disabled=false,
}:{
 availableFields:BiodataFieldColumn[];selected:ProfileTableColumn[];
 onSaved:()=>void;disabled?:boolean;
}){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState<ProfileTableColumn[]>([]);
 const [editorId,setEditorId]=useState<string|null>(null);
 const [heading,setHeading]=useState('');
 const [fieldIds,setFieldIds]=useState<string[]>([]);
 const [query,setQuery]=useState('');
 const [saving,setSaving]=useState(false);
 const fieldsById=useMemo(()=>new Map(availableFields.map(field=>[field.id,field])),[availableFields]);
 const dirty=JSON.stringify(draft)!==JSON.stringify(selected);
 const isEditing=editorId!==null;
 const startNew=()=>{setEditorId('new');setHeading('');setFieldIds([]);setQuery('');};
 const edit=(column:ProfileTableColumn)=>{
   setEditorId(column.id);setHeading(column.label);setFieldIds([...column.questionIds]);setQuery('');
 };
 const openManager=()=>{setDraft(selected.map(column=>({...column,questionIds:[...column.questionIds]})));setEditorId(null);setQuery('');setOpen(true);};
 const close=()=>{if(!saving)setOpen(false);};
 const move=(index:number,direction:number)=>{
   const target=index+direction;
   if(target<0||target>=draft.length)return;
   setDraft(current=>{const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
 };
 const toggleField=(id:string)=>setFieldIds(current=>current.includes(id)
    ?current.filter(value=>value!==id)
    :current.length<MAX_FIELDS?[...current,id]:current);
 const commit=()=>{
   const label=heading.trim();
   if(label.length<2||label.length>55){toast.error('কলামের নাম ২–৫৫ অক্ষরের দিন');return;}
   if(fieldIds.length===0){toast.error('অন্তত একটি বায়োডাটা ফিল্ড বাছুন');return;}
   if(editorId==='new'&&draft.length>=MAX_COLUMNS){toast.error('সর্বোচ্চ ১২টি কলাম');return;}
   const id=editorId==='new'?'profile-'+crypto.randomUUID().replace(/-/g,''):editorId!;
   setDraft(current=>editorId==='new'
     ?[...current,{id,label,questionIds:[...fieldIds]}]
     :current.map(column=>column.id===editorId?{...column,label,questionIds:[...fieldIds]}:column));
   setEditorId(null);setQuery('');
 };
 const matches=useMemo(()=>{
   const term=query.trim().toLocaleLowerCase();
   return availableFields.filter(field=>!term||[field.label,field.section,field.type].some(text=>text.toLocaleLowerCase().includes(term)));
 },[availableFields,query]);
 const grouped=useMemo(()=>{
   const group=new Map<string,BiodataFieldColumn[]>();
   for(const field of matches){const key=field.section||'বায়োডাটা';group.set(key,[...(group.get(key)||[]),field]);}
   return [...group.entries()];
 },[matches]);
 const save=async()=>{
   if(!dirty||isEditing)return;
   setSaving(true);
   try{
     const [result,error]=await PatchRequestAxios('/admin/member-columns/profile-layout',{columns:draft});
     if(error||!result)throw new Error(error?.message||'কলাম সংরক্ষণ করা যায়নি');
     toast.success('সদস্য টেবিলের কলাম ও ক্রম সংরক্ষিত হয়েছে');
     setOpen(false);onSaved();
   }catch(error){toast.error(error instanceof Error?error.message:'কলাম সংরক্ষণ করা যায়নি');}
   finally{setSaving(false);}
 };
 return <>
   <button type="button" disabled={disabled} onClick={openManager}
     className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-800 transition hover:bg-rose-50 disabled:opacity-50">
     <Columns3 size={15}/> টেবিলের কলাম সাজান
     <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] tabular-nums">{selected.length}/{MAX_COLUMNS}</span>
   </button>
   <Dialog open={open} onOpenChange={value=>{if(!value)close();}}>
     <DialogContent className="flex max-h-[92dvh] w-[min(96vw,760px)] max-w-[760px] flex-col gap-0 overflow-hidden p-0">
       <DialogHeader className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 text-left">
         <DialogTitle className="flex items-center gap-2 text-[18px]">
           <Columns3 size={20} className="text-rose-600"/> টেবিলের কলাম তৈরি ও সাজান
         </DialogTitle>
         <DialogDescription className="text-[12px] leading-5">
           নিজের মতো কলামের শিরোনাম দিন। একই কলামে ১–৬টি Dynamic Question Builder-এর ফিল্ড যোগ করুন;
           সদস্যের আসল উত্তর ছোট ব্যাজে দেখাবে। ↑↓ দিয়ে ক্রম বদলান বা কলাম সরিয়ে দিন।
         </DialogDescription>
       </DialogHeader>
       <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
         {!isEditing&&<>
         <div className="flex items-center justify-between gap-3">
           <div><h3 className="text-[13px] font-bold text-slate-900">বর্তমান কলাম ({draft.length})</h3>
             <p className="text-[11px] text-slate-500">এই কলামগুলো শুধু অ্যাডমিন টেবিলে দেখানো হবে।</p></div>
           <button type="button" onClick={startNew} disabled={draft.length>=MAX_COLUMNS||saving}
             className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[12px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
             <Plus size={15}/> নতুন কলাম
           </button>
         </div>
         <div className="space-y-2">
           {draft.map((column,index)=><div key={column.id}
             className={cn('flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3',
               editorId===column.id?'border-rose-300 bg-rose-50/60':'border-slate-200 bg-slate-50/30')}>
             <div className="min-w-0 flex-1">
               <p className="text-[13px] font-bold text-slate-900">{column.label}</p>
               <div className="mt-1 flex flex-wrap gap-1">
                 {column.questionIds.map(id=><span key={id}
                   className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                   {fieldsById.get(id)?.label||'Unavailable field'}
                 </span>)}
               </div>
             </div>
             <div className="flex shrink-0 items-center gap-1">
               <button type="button" disabled={index===0||saving} onClick={()=>move(index,-1)}
                 aria-label={column.label+' আগে আনুন'} className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-100 disabled:opacity-35">
                 <ArrowUp size={14}/>
               </button>
               <button type="button" disabled={index===draft.length-1||saving} onClick={()=>move(index,1)}
                 aria-label={column.label+' পরে নিন'} className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-100 disabled:opacity-35">
                 <ArrowDown size={14}/>
               </button>
               <button type="button" onClick={()=>edit(column)} aria-label={column.label+' এডিট'}
                 className="rounded-lg border border-slate-200 bg-white p-2 text-rose-700 hover:bg-rose-50"><Pencil size={14}/></button>
               <button type="button" onClick={()=>{setDraft(current=>current.filter(item=>item.id!==column.id));if(editorId===column.id)setEditorId(null);}}
                 aria-label={column.label+' কলাম সরান'} className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
             </div>
           </div>)}
           {!draft.length&&<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-[12px] text-slate-500">
             কোনো অতিরিক্ত বায়োডাটা কলাম নেই। “নতুন কলাম” চাপুন।
           </div>}
         </div>
         </>}
         {isEditing&&<section aria-label="কলাম এডিট" className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm sm:p-5">
           <div className="flex items-center justify-between gap-2">
             <h3 className="text-[14px] font-bold text-slate-900">
               {editorId==='new'?'নতুন কলাম তৈরি':'কলাম এডিট'}
             </h3>
             <button type="button" aria-label="কলাম তালিকায় ফিরে যান" onClick={()=>setEditorId(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X size={15}/> তালিকায় ফিরুন</button>
           </div>
           <label className="block space-y-1 text-[12px] font-semibold text-slate-700">
             আপনার পছন্দের কলামের শিরোনাম
             <input value={heading} maxLength={55} onChange={event=>setHeading(event.target.value)}
               placeholder="যেমন: ব্যক্তিগত তথ্য / Family / Address" className={control}/>
           </label>
           <div>
             <div className="mb-2 flex items-center justify-between gap-2">
               <p className="text-[12px] font-semibold text-slate-700">এই কলামে কোন ফিল্ডগুলো থাকবে?</p>
               <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold tabular-nums text-rose-700">{fieldIds.length}/{MAX_FIELDS}</span>
             </div>
             <label className="relative block">
               <span className="sr-only">ফিল্ড খুঁজুন</span>
               <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
               <input value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off"
                 placeholder="বৈবাহিক অবস্থা, পেশা, উচ্চতা, জেলা..." className={cn(control,'pl-9 pr-9')}/>
               {query&&<button type="button" onClick={()=>setQuery('')} aria-label="সার্চ মুছুন"
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={14}/></button>}
             </label>
           </div>
           <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
             {grouped.map(([section,fields])=><div key={section}>
               <p className="sticky top-0 bg-white px-1 py-1 text-[11px] font-bold text-slate-500">{section}</p>
               <div className="grid gap-1 sm:grid-cols-2">
                 {fields.map(field=>{
                   const checked=fieldIds.includes(field.id);
                   return <label key={field.id} className={cn('flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-[12px]',
                     checked?'bg-rose-50 text-rose-900':'hover:bg-slate-50',
                     fieldIds.length>=MAX_FIELDS&&!checked&&'opacity-50')}>
                     <input type="checkbox" checked={checked} disabled={!checked&&fieldIds.length>=MAX_FIELDS}
                       onChange={()=>toggleField(field.id)} className="size-4 shrink-0 accent-rose-600"/>
                     <span className="min-w-0 font-medium">{field.label}</span>
                   </label>;
                 })}
               </div>
             </div>)}
             {!grouped.length&&<p className="p-3 text-center text-[12px] text-slate-500">কোনো মিল পাওয়া যায়নি।</p>}
           </div>
           <p className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs leading-5 text-rose-800">
             নিচের গোলাপি বাটনে কলামটি আপডেট করুন। তারপর তালিকা থেকে “সব কলাম Save করুন” চাপলে সার্ভারে সংরক্ষিত হবে।
           </p>
         </section>}
       </div>
       <footer className="z-10 shrink-0 border-t border-rose-100 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:px-5">
         <div className="flex flex-wrap items-center justify-between gap-3">
           <div className="min-w-0 flex-1">
             {isEditing
               ?<p className="text-[12px] font-medium leading-5 text-rose-800">ধাপ ১/২ · কলাম আপডেট করুন, তারপর সব কলাম Save করুন।</p>
               :<p className="text-[12px] font-medium leading-5 text-slate-700">{dirty?'পরিবর্তন এখনো সার্ভারে সংরক্ষিত হয়নি — এখন Save করুন।':'সব কলাম সংরক্ষিত আছে।'}</p>}
             <p className="text-[11px] leading-5 text-slate-500">সদস্যের বায়োডাটার কোনো উত্তর পরিবর্তন হবে না।</p>
           </div>
           <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
             {isEditing?<>
               <button type="button" disabled={saving} onClick={()=>setEditorId(null)}
                 className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">বাতিল</button>
               <button type="button" disabled={saving} onClick={commit}
                 className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-pink-700 bg-pink-600 px-5 text-[14px] font-bold text-white shadow-sm shadow-pink-600/20 transition hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50 sm:flex-none">
                 <Check size={17}/> {editorId==='new'?'কলাম তালিকায় যোগ করুন':'কলাম আপডেট করুন'}
               </button>
             </>:<>
               <button type="button" onClick={close} disabled={saving}
                 className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">বন্ধ করুন</button>
               <button type="button" disabled={!dirty||saving} onClick={()=>void save()}
                 className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 text-[14px] font-bold text-white shadow-sm shadow-pink-600/20 transition hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:flex-none">
                 {saving?<Loader2 size={17} className="animate-spin"/>:<Check size={17}/>} {saving?'সংরক্ষণ হচ্ছে...':'সব কলাম Save করুন'}
               </button>
             </>}
           </div>
         </div>
       </footer>
     </DialogContent>
   </Dialog>
 </>;
}
