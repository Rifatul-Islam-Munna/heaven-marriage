'use client';
import Link from 'next/link';
import {BadgeCheck,Check,HeartHandshake,ArrowUpRight,Clock3} from 'lucide-react';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import {formatPremiumFee,premiumTotal,resolvePremiumSettings,type PremiumSettings} from '@/lib/premium-settings';
import {cn} from '@/lib/utils';

export default function PremiumOfferCard({compact=false}:{
 compact?:boolean;source?:'home'|'pricing'|'signup'|'website';
}){
 const {data,isLoading}=useQueryWrapper<{premium?:PremiumSettings}>(['public-settings'],'/public/settings',{staleTime:60000});
 if(isLoading||!data)return null; // Respect the admin master switch even while loading.
 const premium=resolvePremiumSettings(data.premium);
 if(!premium.visible)return null;
 return <section aria-label="Optional Premium Marriage Assistance"
   className={cn('relative isolate overflow-hidden rounded-[24px] border border-blue-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-[0_22px_70px_-38px_rgba(30,64,175,.5)]',
     compact?'p-4 sm:p-5':'p-5 sm:p-7 lg:p-9')}>
   <div aria-hidden className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border border-blue-400/20"/>
   <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
     <div>
       <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/35 bg-blue-400/10 px-3 py-1 text-[11px] font-semibold text-blue-100">
         <BadgeCheck size={15} className="text-sky-300"/> Optional Premium Service
       </span>
       <h2 className={cn('mt-3 font-semibold leading-tight text-white',compact?'text-[19px]':'text-2xl sm:text-3xl')}>{premium.adHeadline}</h2>
       <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-200">{premium.adDescription}</p>
       <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate-100">
         <span className="flex items-center gap-1.5"><Clock3 size={14} className="text-sky-300"/>{premium.durationDays} days</span>
         <span className="flex items-center gap-1.5"><HeartHandshake size={14} className="text-sky-300"/>{premium.assistedConnections} assisted connections</span>
         <span className="flex items-center gap-1.5"><Check size={14} className="text-sky-300"/>{premium.includedConnections} wallet connections included</span>
       </div>
       {!compact&&<ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
         {premium.benefits.slice(0,4).map(benefit=><li key={benefit} className="flex items-start gap-2 text-[12px] leading-5 text-slate-100">
           <Check size={14} className="mt-0.5 shrink-0 text-blue-300"/>{benefit}</li>)}
       </ul>}
     </div>
     <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
       <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">Total Premium checkout</p>
       <p className="mt-1 text-[31px] font-bold tracking-tight">{formatPremiumFee(premiumTotal(premium))}</p>
       <p className="mt-1 text-[12px] text-blue-100">Base {formatPremiumFee(premium.fee)} + service charge {formatPremiumFee(premium.serviceCharge)}</p>
       <p className="mt-2 text-[11px] leading-4 text-slate-200">Extra connections: {premium.extraConnectionFee?formatPremiumFee(premium.extraConnectionFee)+' / unit (ask team before paying)':'No fixed additional rate configured'}</p>
       <div className="mt-4 grid gap-2">
         <Link href="/premium" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-500 px-3 text-[13px] font-semibold text-white transition hover:bg-blue-400">
           Premium details <ArrowUpRight size={15}/>
         </Link>
       </div>
       <p className="mt-3 text-[11px] leading-4 text-slate-200">Free Biodata remains free. Premium is optional; payment happens only if you choose it.</p>
     </div>
   </div>
 </section>;
}
