import Link from 'next/link';
import PremiumCheckoutButton from '@/components/custom/profile/PremiumCheckoutButton';
import {notFound} from 'next/navigation';
import {BadgeCheck,CheckCircle2,Clock3,HeartHandshake,ShieldCheck,Wallet} from 'lucide-react';
import {publicMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
import {defaultPremiumSettings,formatPremiumFee,premiumTotal,resolvePremiumSettings,type PremiumSettings} from '@/lib/premium-settings';

export const dynamic='force-dynamic';
async function loadPremiumSettings():Promise<PremiumSettings>{
 const base=process.env.BASE_URL;
 if(!base)return defaultPremiumSettings;
 try{
   const response=await fetch(base.replace(/\/$/,'')+'/public/settings',
      {cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!response.ok)return defaultPremiumSettings;
   const data=await response.json() as {premium?:PremiumSettings};
   return resolvePremiumSettings(data.premium);
 }catch{return defaultPremiumSettings;}
}
export async function generateMetadata(){
 const p=await loadPremiumSettings();
 return seoMetadata('/premium',publicMetadata(p.title+' | Niqaha.com',p.summary,'/premium'));
}
export default async function PremiumPage(){
 const p=await loadPremiumSettings();
 if(!p.visible)notFound();
 return <main className="bg-gradient-to-b from-slate-50 via-white to-pink-50/30">
  <SeoStructuredData path="/premium"/>
  <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
    <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white sm:p-10">
      <div className="relative z-10 grid gap-7 md:grid-cols-[1.3fr_.7fr] md:items-center">
       <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100"><BadgeCheck size={17} className="text-sky-300"/> Blue Premium Member Service</span>
        <h1 className="mt-4 text-[30px] font-bold leading-tight sm:text-[43px]">{p.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">{p.intro} {p.summary}</p>
        <p className="mt-3 text-xs leading-5 text-blue-200">Premium is optional. Standard biodata registration is free; a published standard biodata receives a pink reviewed badge.</p>
       </div>
       <div className="rounded-2xl border border-blue-300/25 bg-white/10 p-5">
         <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Premium checkout total</p>
         <p className="mt-1 text-[38px] font-bold">{formatPremiumFee(premiumTotal(p))}</p>
         <dl className="space-y-2 text-[13px] text-blue-100">
           <div className="flex justify-between"><dt>Service price</dt><dd>{formatPremiumFee(p.fee)}</dd></div>
           <div className="flex justify-between"><dt>Extra service charge</dt><dd>{formatPremiumFee(p.serviceCharge)}</dd></div>
           <div className="flex justify-between border-t border-white/20 pt-2"><dt>Duration</dt><dd className="font-semibold text-white">{p.durationDays} days</dd></div>
         </dl>
         {p.enabled?<PremiumCheckoutButton amount={formatPremiumFee(premiumTotal(p))}/>: 
           <p className="mt-4 rounded-lg bg-amber-200/15 p-3 text-xs text-amber-100">New Premium applications are currently paused.</p>}
       </div>
      </div>
    </header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Premium package details">
      {[
        {label:'Assisted connections',value:String(p.assistedConnections),hint:'Team-guided introductions',icon:HeartHandshake},
        {label:'Included wallet connections',value:String(p.includedConnections),hint:'Normal connection credits included with purchase',icon:Wallet},
        {label:'Service duration',value:p.durationDays+' days',hint:'Starts when verified payment activates membership',icon:Clock3},
      ].map(item=><div key={item.label} className="rounded-xl border border-blue-100 bg-white p-5">
        <item.icon className="size-5 text-blue-600"/>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
        <p className="mt-1 text-[28px] font-bold text-slate-900">{item.value}</p>
        <p className="mt-1 text-xs text-slate-600">{item.hint}</p>
      </div>)}
    </section>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-pink-100 bg-white p-6">
       <h2 className="text-xl font-bold text-slate-900">Premium team কীভাবে সাহায্য করবে?</h2>
       <ul className="mt-5 space-y-3">{p.benefits.map(item=><li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><CheckCircle2 size={18} className="mt-1 shrink-0 text-blue-600"/>{item}</li>)}</ul>
       <h3 className="mt-6 text-base font-bold text-slate-900">আপনার পরবর্তী ধাপ</h3>
       <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">{p.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
       <h2 className="text-xl font-bold text-slate-900">Extra connections & verification</h2>
       <p className="mt-4 text-sm leading-6 text-slate-700">{p.extraConnectionPolicy}</p>
       <p className="mt-3 text-sm font-semibold text-slate-800">Extra assisted connection reference rate: {p.extraConnectionFee?formatPremiumFee(p.extraConnectionFee):'Not configured'}</p>
       <p className="mt-2 text-xs leading-5 text-slate-600">Extra connections are not charged automatically during Premium checkout; any future paid service requires a separate, explicit order and your agreement.</p>
       <div className="mt-6 grid gap-3 sm:grid-cols-2">
         <div className="rounded-lg bg-blue-50 p-3"><p className="flex items-center gap-2 text-sm font-bold text-blue-800"><BadgeCheck size={17}/> Blue Premium</p><p className="mt-1 text-xs leading-5 text-blue-900">Active Premium service subscription; not a government identity check.</p></div>
         <div className="rounded-lg bg-pink-50 p-3"><p className="flex items-center gap-2 text-sm font-bold text-pink-800"><ShieldCheck size={17}/> Pink reviewed</p><p className="mt-1 text-xs leading-5 text-pink-900">Free biodata reviewed and published by the team.</p></div>
       </div>
       {p.contactPhone&&<a href={'tel:'+p.contactPhone} className="mt-5 inline-flex text-sm font-bold text-pink-700 underline">যোগাযোগ: {p.contactPhone}</a>}
       <p className="mt-5 text-xs leading-6 text-slate-600">{p.footer}</p>
       <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-pink-700"><Link href="/policies/refund" className="underline">Refund policy</Link><Link href="/pricing" className="underline">Connection prices</Link></div>
      </section>
    </div>
  </div>
 </main>;
}
