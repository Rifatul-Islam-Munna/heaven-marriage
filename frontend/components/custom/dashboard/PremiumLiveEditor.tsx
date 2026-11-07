'use client';

import {useState} from 'react';
import {BadgeCheck,CheckCircle2,Crown,Eye,Monitor,Smartphone,UsersRound} from 'lucide-react';
import {cn} from '@/lib/utils';
import {type PremiumSettings,premiumTotal,formatPremiumFee} from '@/lib/premium-settings';

export default function PremiumLiveEditor({premium,onPatch}:{
 premium:PremiumSettings;onPatch:(value:Partial<PremiumSettings>)=>void;
}){
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
 return <section id="premium-visual-preview" className="scroll-mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
   <header className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-[#f7faff] px-4 py-4 sm:px-5">
     <div>
       <h2 className="flex items-center gap-2 text-[16px] font-bold text-slate-900">
         <Eye size={18} className="text-blue-600"/> Premium লাইভ কনটেন্ট এডিটর
       </h2>
       <p className="mt-1 text-[12px] leading-5 text-slate-600">
         প্রিভিউতে লেখার উপর ক্লিক করে সরাসরি পরিবর্তন করুন। নিচে Save premium service চাপলে
         নতুন লেখা ও প্যাকেজের নিয়ম পাবলিক পেজে যাবে।
       </p>
     </div>
     <div role="group" aria-label="Premium preview size"
       className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1">
       <button type="button" onClick={()=>setDevice('desktop')} aria-pressed={device==='desktop'}
         className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition',
           device==='desktop'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-100')}>
         <Monitor size={14}/> Desktop
       </button>
       <button type="button" onClick={()=>setDevice('mobile')} aria-pressed={device==='mobile'}
         className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition',
           device==='mobile'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-100')}>
         <Smartphone size={14}/> Mobile
       </button>
     </div>
   </header>
   <div className="bg-slate-50 px-3 py-5 sm:px-6 sm:py-7">
     <div className={cn('mx-auto w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_50px_rgba(18,29,45,.08)] transition-[max-width]',
       device==='mobile'?'max-w-[370px]':'max-w-[900px]')}>
       <div className="border-b border-blue-100 bg-[#0f1e38] px-5 py-6 text-white sm:px-7">
         <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/30 bg-blue-300/10 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
           <Crown size={12}/> Premium Marriage Assistance
         </span>
         <label className="mt-3 block">
           <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-blue-200">শিরোনাম · ক্লিক করে এডিট করুন</span>
           <input aria-label="Edit premium title in visual preview" value={premium.title} maxLength={120}
             onChange={event=>onPatch({title:event.target.value})}
             className="block w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-sans text-[20px] font-bold leading-snug text-white outline-none placeholder:text-white/50 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/25 sm:text-[25px]"/>
         </label>
         <label className="mt-3 block">
           <span className="mb-1 block text-[10px] font-semibold text-blue-200">সংক্ষিপ্ত বিবরণ</span>
           <textarea aria-label="Edit premium introduction in visual preview"
             value={premium.intro} rows={device==='mobile'?4:2} maxLength={2000}
             onChange={event=>onPatch({intro:event.target.value})}
             className="block w-full resize-y rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[13px] leading-6 text-white outline-none placeholder:text-blue-200 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/25"/>
         </label>
       </div>
       <div className="space-y-5 p-4 sm:p-6">
         <div className={cn('grid gap-3',device==='desktop'?'sm:grid-cols-3':'grid-cols-1')}>
           {[
             {label:'মোট মূল্য',value:formatPremiumFee(premiumTotal(premium))},
             {label:'সার্ভিস মেয়াদ',value:premium.durationDays+' days'},
             {label:'Assisted Connections',value:String(premium.assistedConnections)},
           ].map(tile=><div key={tile.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
             <p className="text-[11px] font-semibold text-slate-500">{tile.label}</p>
             <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900">{tile.value}</p>
           </div>)}
         </div>
         <div className="space-y-2">
           <p className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
             <BadgeCheck className="size-4 text-blue-600"/> Premium সুবিধাসমূহ
             <span className="text-[11px] font-normal text-slate-500">(এখান থেকেই লেখা পরিবর্তন করুন)</span>
           </p>
           {premium.benefits.map((benefit,index)=><label key={index} className="flex items-start gap-2.5">
             <CheckCircle2 size={16} className="mt-2 shrink-0 text-emerald-600"/>
             <input value={benefit} maxLength={180} aria-label={'Edit premium benefit '+(index+1)}
               onChange={event=>onPatch({benefits:premium.benefits.map((text,i)=>i===index?event.target.value:text)})}
               className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-[12px] leading-5 text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"/>
           </label>)}
         </div>
         <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
           <p className="flex items-center gap-2 text-[13px] font-semibold text-blue-900"><UsersRound size={15}/> সার্ভিস নেওয়ার ধাপ</p>
           {premium.steps.map((step,index)=><label key={index} className="flex items-start gap-2 text-[12px]">
             <span className="mt-2.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">{index+1}</span>
             <input aria-label={'Edit premium step '+(index+1)} maxLength={500} value={step}
               onChange={event=>onPatch({steps:premium.steps.map((text,i)=>i===index?event.target.value:text)})}
               className="min-h-9 min-w-0 flex-1 rounded-lg border border-blue-100 bg-white px-2.5 text-[12px] text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
           </label>)}
         </div>
         <label className="block">
           <span className="mb-1 block text-[11px] font-bold text-slate-700">পাবলিক পেজের শেষ বক্তব্য</span>
           <textarea aria-label="Edit premium footer message in visual preview" value={premium.footer}
             onChange={event=>onPatch({footer:event.target.value})} maxLength={2000} rows={2}
             className="block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"/>
         </label>
         <p className="text-center text-[11px] leading-5 text-slate-500">এটি এডিটিং প্রিভিউ; প্রকাশিত পেজ দেখতে উপরের “পাবলিক পেজ দেখুন” খুলুন।</p>
       </div>
     </div>
   </div>
 </section>;
}
