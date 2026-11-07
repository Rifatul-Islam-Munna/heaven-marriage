'use client';

import {useMemo,useState} from 'react';
import {ArrowLeft,Building2,Check,ChevronRight,Home,MapPin,Search,X} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import type {LocationEntry} from '@/lib/location-options';

export type SearchLocality={
 upazilaName:string;cityName:string;areaName:string;
};
export type LocalityParent={
 kind:'upazila'|'cityCorporation';name:string;label:string;
};
export type LocalityChild={name:string;label:string;parentArea?:string};

export function availableLocalityChildren(
 parent:LocalityParent|undefined,areas:readonly LocationEntry[],parentArea?:string,
):LocalityChild[]{
 if(!parent)return [];
 return areas.filter(area=>
   area.kind==='area' &&
   (parent.kind==='cityCorporation'
     ? area.cityCorporation===parent.name
     : area.upazila===parent.name) &&
   (parentArea?area.parentArea===parentArea:!area.parentArea) &&
   area.enabled!==false,
 ).map(area=>({name:area.name,label:area.label,parentArea:area.parentArea}));
}
export function toSearchLocality(parent:LocalityParent|undefined,area=''):SearchLocality{
 if(!parent)return {upazilaName:'',cityName:'',areaName:''};
 return {
   upazilaName:parent.kind==='upazila'?parent.name:'',
   cityName:parent.kind==='cityCorporation'?parent.name:'',
   areaName:area,
 };
}

export default function SearchLocationPicker({
 districtName,upazilas,cities,areas,value,onChange,
}:{
 districtName:string;
 upazilas:{id:string|number;name:string;bn_name:string}[];
 cities:LocationEntry[];areas:LocationEntry[];
 value:SearchLocality;onChange:(next:SearchLocality)=>void;
}){
 const [open,setOpen]=useState(false);
 const [step,setStep]=useState<'parent'|'area'|'subarea'>('parent');
 const [parentArea,setParentArea]=useState('');
 const [search,setSearch]=useState('');
 const parents=useMemo<LocalityParent[]>(()=>{
   const items:LocalityParent[]=[
     ...upazilas.map(upazila=>({kind:'upazila' as const,name:upazila.name,label:upazila.bn_name})),
     ...cities.filter(city=>city.enabled!==false).map(city=>({
       kind:'cityCorporation' as const,name:city.name,label:city.label,
     })),
   ];
   // A custom entry can overlap a built-in name. Never show duplicate selections.
   return [...new Map(items.map(p=>[p.kind+':'+p.name,p])).values()];
 },[upazilas,cities]);
 const selected=parents.find(p=>p.kind==='upazila'&&p.name===value.upazilaName) ||
   parents.find(p=>p.kind==='cityCorporation'&&p.name===value.cityName);
 const children=availableLocalityChildren(selected,areas);
 const selectedArea=children.find(a=>a.name===value.areaName);
 const selectedNested=children.find(area=>availableLocalityChildren(selected,areas,area.name)
   .some(child=>child.name===value.areaName));
 const nestedValue=selectedNested
   ?availableLocalityChildren(selected,areas,selectedNested.name).find(item=>item.name===value.areaName):undefined;
 const display=selected
   ?[selected.label,selectedNested?.label,selectedArea?.label||nestedValue?.label||value.areaName].filter(Boolean).join(' › ')
   :'সব উপজেলা / সিটি / পৌরসভা / এলাকা';
 const openChange=(next:boolean)=>{
   setOpen(next);
   if(next){setStep(selectedNested?'subarea':selected?'area':'parent');setParentArea(selectedNested?.name||'');setSearch('');}
 };
 const chooseParent=(parent:LocalityParent)=>{
   onChange(toSearchLocality(parent));
   setParentArea('');setSearch('');
   if(availableLocalityChildren(parent,areas).length>0)setStep('area');
   else setOpen(false);
 };
 const clear=()=>{
   onChange(toSearchLocality(undefined));setSearch('');setParentArea('');setStep('parent');
 };
 const filtered=parents.filter(p=>
   [p.label,p.name,p.kind==='upazila'?'উপজেলা':'সিটি কর্পোরেশন']
     .some(text=>text.toLowerCase().includes(search.toLowerCase().trim())));
 const chooseArea=(area:LocalityChild)=>{
   if(availableLocalityChildren(selected,areas,area.name).length>0){
     setParentArea(area.name);setSearch('');setStep('subarea');
   }else{onChange(toSearchLocality(selected,area.name));setOpen(false);}
 };
 const shownChildren=step==='subarea'
   ?availableLocalityChildren(selected,areas,parentArea):children;
 const filteredChildren=shownChildren.filter(a=>
   [a.label,a.name].some(text=>text.toLowerCase().includes(search.toLowerCase().trim())));
 return <div className={cn('group min-w-0',!districtName&&'opacity-50')}>
   <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
     <span className="flex size-8 items-center justify-center rounded-full bg-pink-100 text-pink-600">
       <Home className="size-4" aria-hidden/>
     </span>
     <span>উপজেলা / সিটি / ওয়ার্ড</span>
   </label>
   <Popover open={open} onOpenChange={openChange}>
     <PopoverTrigger asChild>
       <Button variant="outline" role="combobox"
         aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"
         aria-expanded={open} disabled={!districtName}
         className="h-11 w-full min-w-0 justify-between gap-1.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 text-left text-[13px] font-medium transition-colors hover:border-pink-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-pink-200 sm:h-12">
         <span className="min-w-0 truncate">{districtName?display:'আগে জেলা নির্বাচন করুন'}</span>
         <ChevronRight className={cn('size-4 shrink-0 text-pink-600 transition-transform',open&&'rotate-90')} aria-hidden/>
       </Button>
     </PopoverTrigger>
     <PopoverContent align="end" sideOffset={8}
       className="z-[80] flex max-h-[min(43dvh,380px)] w-[min(92vw,370px)] flex-col gap-0 overflow-hidden rounded-2xl border border-pink-100 bg-white p-0 shadow-[0_18px_50px_rgba(73,28,54,.18)]">
       <div className="border-b border-pink-100 bg-pink-50/70 px-3.5 py-3">
         <div className="flex items-center justify-between gap-2">
           <div className="flex min-w-0 items-center gap-2">
             {step!=='parent'&&<button type="button" aria-label="পেছনে যান"
               onClick={()=>{setStep(step==='subarea'?'area':'parent');setSearch('');}}
               className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-pink-700 hover:bg-pink-100">
               <ArrowLeft className="size-4"/>
             </button>}
             <div className="min-w-0">
               <p className="text-[13px] font-bold text-slate-900">
                 {step==='parent'?'উপজেলা অথবা সিটি নির্বাচন করুন':step==='subarea'?'ভিতরের এলাকা / ওয়ার্ড':'পৌরসভা / এলাকা / ওয়ার্ড'}
               </p>
               <p className="truncate text-[11px] font-medium text-slate-500">
                 {step==='parent'?districtName:step==='subarea'?parentArea:selected?.label}
               </p>
             </div>
           </div>
           <button type="button" onClick={clear}
             className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-pink-700 hover:bg-white">
             সব দেখুন
           </button>
         </div>
         <p className="mt-2 text-[11px] leading-4 text-slate-600">
           জেলা → উপজেলা / সিটি → পৌরসভা / এলাকা → ওয়ার্ড। যেকোনো ধাপে থামতে পারবেন।
         </p>
       </div>
       {step==='subarea'&&selected&&<button type="button"
         onClick={()=>{onChange(toSearchLocality(selected,parentArea));setOpen(false);}}
         className="flex min-h-10 w-full items-center justify-between border-b border-pink-100 bg-emerald-50/80 px-4 text-left text-[12px] font-bold text-emerald-800 hover:bg-emerald-100">
         <span>শুধু {parentArea} পর্যন্ত বেছে নিন</span><Check className="size-4"/>
       </button>}
       {step==='area'&&selected&&<button type="button"
         onClick={()=>{onChange(toSearchLocality(selected));setOpen(false);}}
         className="flex min-h-10 w-full items-center justify-between border-b border-pink-100 bg-emerald-50/80 px-4 text-left text-[12px] font-bold text-emerald-800 hover:bg-emerald-100">
         <span>শুধু {selected.label} পর্যন্ত খুঁজুন</span>
         <Check className="size-4"/>
       </button>}
       <label className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2">
         <Search className="size-4 shrink-0 text-pink-500" aria-hidden/>
         <span className="sr-only">স্থান খুঁজুন</span>
         <input value={search} onChange={event=>setSearch(event.target.value)}
           placeholder={step==='parent'?'উপজেলা / সিটি খুঁজুন':step==='subarea'?'ভিতরের ওয়ার্ড / মহল্লা':'পৌরসভা / এলাকা খুঁজুন'}
           className="h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"/>
         {search&&<button type="button" onClick={()=>setSearch('')} aria-label="খোঁজা মুছুন" className="text-slate-500"><X className="size-4"/></button>}
       </label>
       <div role="listbox" aria-label={step==='parent'?'উপজেলা ও সিটি কর্পোরেশন':'এলাকা ও ওয়ার্ড'}
         className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
         {step==='parent' ? <>
           {filtered.filter(p=>p.kind==='upazila').length>0&&
             <p className="px-2 pb-1 pt-2 text-[11px] font-bold text-slate-500">উপজেলা</p>}
           {filtered.filter(p=>p.kind==='upazila').map(p=><button type="button"
             role="option" aria-selected={selected?.kind===p.kind&&selected?.name===p.name}
             key={p.kind+':'+p.name} onClick={()=>chooseParent(p)}
             className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-pink-50 focus-visible:bg-pink-50">
             <span className="min-w-0 break-words">{p.label}</span>
             {selected?.name===p.name&&selected.kind===p.kind?<Check className="size-4 shrink-0 text-pink-600"/>:<ChevronRight className="size-4 shrink-0 text-slate-400"/>}
           </button>)}
           {filtered.some(p=>p.kind==='cityCorporation')&&
             <p className="px-2 pb-1 pt-3 text-[11px] font-bold text-slate-500">সিটি কর্পোরেশন</p>}
           {filtered.filter(p=>p.kind==='cityCorporation').map(p=><button type="button"
             role="option" aria-selected={selected?.kind===p.kind&&selected?.name===p.name}
             key={p.kind+':'+p.name} onClick={()=>chooseParent(p)}
             className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-pink-50 focus-visible:bg-pink-50">
             <span className="min-w-0 break-words"><Building2 className="mr-1.5 inline size-3.5 text-pink-500"/>{p.label}</span>
             {selected?.name===p.name&&selected.kind===p.kind?<Check className="size-4 shrink-0 text-pink-600"/>:<ChevronRight className="size-4 shrink-0 text-slate-400"/>}
           </button>)}
           {!filtered.length&&<p className="px-3 py-7 text-center text-[12px] text-slate-500">কোনো স্থান পাওয়া যায়নি।</p>}
         </> : <>
           {filteredChildren.map(area=><button type="button" role="option"
             aria-selected={value.areaName===area.name} key={area.name}
             onClick={()=>step==='subarea'
               ?(onChange(toSearchLocality(selected,area.name)),setOpen(false))
               :chooseArea(area)}
             className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-pink-50 focus-visible:bg-pink-50">
             <span className="min-w-0 break-words"><MapPin className="mr-1 inline size-3.5 text-pink-500"/>{area.label}</span>
             {value.areaName===area.name?<Check className="size-4 shrink-0 text-pink-600"/>:
               step==='area'&&availableLocalityChildren(selected,areas,area.name).length>0
                 ?<ChevronRight className="size-4 shrink-0 text-slate-400"/>:null}
           </button>)}
           {!filteredChildren.length&&<p className="px-3 py-6 text-center text-[12px] leading-5 text-slate-500">
             এখানে এখনো কোনো এলাকা যোগ করা হয়নি। চাইলে শুধু মূল স্থানটি বেছে নিন।
           </p>}
         </>}
       </div>
       <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2 text-[11px] font-medium text-slate-500">
         <span>{selected?selected.label:'শুধু জেলা দিয়েও খুঁজতে পারবেন'}</span>
         <button type="button" onClick={()=>setOpen(false)}
           className="rounded-md px-2.5 py-1.5 font-bold text-pink-700 hover:bg-pink-50">সম্পন্ন</button>
       </div>
     </PopoverContent>
   </Popover>
 </div>;
}
