'use client';
import { useMemo } from 'react';
import {Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import { AlertTriangle, BarChart3, CreditCard, RefreshCw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import {cn} from '@/lib/utils';

type IncomeBucket = {
  month:string; connectionGross:number; premiumGross:number; gross:number;
  refunds:number; net:number; manualNet:number; bkashNet:number; payments:number;
};
type IncomeTransaction = { id:string; source:'connections'|'premium'; method:'bKash'|'Manual'; event:'paid'|'refund';amount:number;at:string;reference:string };
type IncomeReport = {
  currency:'BDT'; timezone:'Asia/Dhaka'; month:string; previousMonth:string;
  current:IncomeBucket; previous:IncomeBucket; previousComparableNet:number;
  growthPercent:number|null; months:IncomeBucket[]; allTime:IncomeBucket;
  missingPaidDates:number; missingRefundDates:number;
  recent:IncomeTransaction[];
};
const money=(value:number)=>'৳'+Number(value||0).toLocaleString('en-BD',{minimumFractionDigits:0,maximumFractionDigits:2});
const monthLabel=(month:string)=>new Intl.DateTimeFormat('en-BD',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
const moneyTitle='text-[11px] font-semibold uppercase tracking-wide text-slate-500';
function SummaryStat({label,value,note,positive=false}:{label:string;value:string;note:string;positive?:boolean}) {
 return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
  <p className={moneyTitle}>{label}</p>
  <p className={cn('mt-2 text-[23px] font-bold tabular-nums sm:text-[26px]',positive?'text-emerald-700':'text-slate-900')}>{value}</p>
  <p className="mt-1 text-[11px] leading-4 text-slate-500">{note}</p>
 </div>;
}
export default function IncomeOverview(){
 const {data,isLoading,isError,refetch}=useQueryWrapper<IncomeReport>(['admin-income'],'/platform/admin/income',{staleTime:30000});
 const max=useMemo(()=>Math.max(1,...(data?.months||[]).map(row=>Math.max(row.net,0))),[data]);
 const growth=data?.growthPercent ?? null;
 return <section aria-label="আয়ের হিসাব" className="space-y-4 rounded-xl border border-pink-100 bg-pink-50/30 p-3 sm:p-5">
   <header className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="flex items-center gap-2 text-[17px] font-bold text-gray-900"><BarChart3 className="size-5 text-pink-600"/> Income overview <span className="text-sm font-normal text-slate-600">(আয়ের হিসাব)</span></h2>
      <p className="mt-1 max-w-3xl text-[12px] leading-5 text-gray-600">শুধু <strong>verified paid</strong> Connection ও Premium order-কে received amount ধরা হয়। Pending/Failed payment বা member balance-কে Income ধরা হয় না।</p>
      <p className="text-[11px] text-gray-500">BDT · Bangladesh time (UTC+6) · Calendar months · Refunded amount is deducted on recorded refund date</p>
    </div>
    <button type="button" onClick={()=>void refetch()} disabled={isLoading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-white px-3 py-2 text-xs font-semibold text-pink-700 hover:bg-pink-50 disabled:opacity-60">
      <RefreshCw size={14} className={isLoading?'animate-spin':''}/> Refresh income
    </button>
   </header>
   {isError&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">আয়ের হিসাব লোড হয়নি। Refresh income দিয়ে আবার চেষ্টা করুন।</p>}
   {!data&&isLoading&&<div className="rounded-lg bg-white px-4 py-8 text-center text-sm text-slate-500">Verified transactions loading…</div>}
   {data&&<>
     <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
       <SummaryStat label="This month · Received" value={money(data.current.gross)} note={monthLabel(data.month)+' · verified collections'}/>
       <SummaryStat label="This month · Refunds" value={money(data.current.refunds)} note="Refunds recorded this month"/>
       <SummaryStat label="This month · Net receipts" value={money(data.current.net)} positive={data.current.net>=0} note="Received − refunded (not profit)"/>
       <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <p className={moneyTitle}>Growth · Same period last month</p>
        <div className="mt-2 flex items-center gap-2">
          {growth===null?<span className="text-[22px] font-bold text-gray-700">N/A</span>
           :growth>=0?<TrendingUp className="size-5 text-emerald-700"/>:<TrendingDown className="size-5 text-red-600"/>}
          {growth!==null&&<span className={cn('text-[23px] font-bold tabular-nums',growth>=0?'text-emerald-700':'text-red-700')}>{growth>0?'+':''}{growth}%</span>}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          {growth===null?'Previous comparable period had no positive net receipts':
          'This month-to-date compared with the same elapsed time last month'}
        </p>
       </div>
     </div>
     <div className="grid gap-3 lg:grid-cols-3">
       <div className="rounded-xl border border-slate-200 bg-white p-4">
         <div className="flex items-center gap-2 text-slate-800"><Wallet className="size-4 text-pink-600"/><h3 className="text-sm font-bold">Previous full month</h3></div>
         <p className="mt-2 text-[23px] font-bold tabular-nums">{money(data.previous.net)}</p>
         <p className="text-xs text-slate-500">{monthLabel(data.previousMonth)} · entire calendar month</p>
         <p className="mt-2 text-xs text-slate-600">Same-length comparison: {money(data.previousComparableNet)}</p>
       </div>
       <div className="rounded-xl border border-slate-200 bg-white p-4">
         <div className="flex items-center gap-2"><CreditCard className="size-4 text-pink-600"/><h3 className="text-sm font-bold text-slate-800">This month · sources</h3></div>
         <dl className="mt-2 space-y-1.5 text-sm">
           <div className="flex justify-between gap-2"><dt className="text-gray-600">Connection sales</dt><dd className="font-semibold tabular-nums">{money(data.current.connectionGross)}</dd></div>
           <div className="flex justify-between gap-2"><dt className="text-gray-600">Premium purchases</dt><dd className="font-semibold tabular-nums">{money(data.current.premiumGross)}</dd></div>
           <div className="flex justify-between gap-2 border-t pt-1.5"><dt className="text-gray-600">Orders verified</dt><dd className="font-semibold tabular-nums">{data.current.payments}</dd></div>
         </dl>
       </div>
       <div className="rounded-xl border border-slate-200 bg-white p-4">
         <h3 className="text-sm font-bold text-slate-800">Payment method · This month</h3>
         <dl className="mt-2 space-y-1.5 text-sm">
           <div className="flex justify-between gap-2"><dt className="text-gray-600">bKash (after refunds)</dt><dd className="font-semibold tabular-nums">{money(data.current.bkashNet)}</dd></div>
           <div className="flex justify-between gap-2"><dt className="text-gray-600">Manual verified (after refunds)</dt><dd className="font-semibold tabular-nums">{money(data.current.manualNet)}</dd></div>
           <div className="flex justify-between gap-2 border-t pt-1.5"><dt className="text-gray-600">Lifetime recorded net</dt><dd className="font-semibold tabular-nums">{money(data.allTime.net)}</dd></div>
         </dl>
       </div>
     </div>
     <section aria-label="শেষ ছয় মাসের আয়ের বার চার্ট" className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
       <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
         <div>
           <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
             <BarChart3 size={17} className="text-rose-600"/> মাসভিত্তিক আয়ের চার্ট
           </h3>
           <p className="mt-1 text-[12px] leading-5 text-slate-500">
             শেষ ছয় মাসের Verified Connection ও Premium receipts এবং recorded refunds (BDT)।
           </p>
         </div>
         <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-800">Verified transactions only</span>
       </div>
       <div className="w-full overflow-x-auto">
         <div className="h-[260px] min-w-[480px] sm:h-[320px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data.months} margin={{top:12,right:16,left:5,bottom:0}} barCategoryGap="22%">
               <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 5"/>
               <XAxis dataKey="month" tickFormatter={monthLabel}
                 tick={{fontSize:11,fill:'#64748B'}} axisLine={false} tickLine={false}/>
               <YAxis tickFormatter={(v:number)=>v>=1000?'৳'+Math.round(v/1000)+'k':'৳'+v}
                 tick={{fontSize:11,fill:'#64748B'}} axisLine={false} tickLine={false} width={54}/>
               <Tooltip formatter={(value)=>money(Number(value||0))}
                 labelFormatter={label=>monthLabel(String(label))}
                 contentStyle={{borderRadius:12,borderColor:'#E2E8F0',boxShadow:'0 10px 28px rgba(15,23,42,.1)'}}/>
               <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:11,paddingTop:12}}/>
               <Bar dataKey="connectionGross" name="Connection sales" fill="#2563EB" radius={4} isAnimationActive={false}/>
               <Bar dataKey="premiumGross" name="Premium" fill="#E11D75" radius={4} isAnimationActive={false}/>
               <Bar dataKey="refunds" name="Refunds" fill="#D97706" radius={4} isAnimationActive={false}/>
             </BarChart>
           </ResponsiveContainer>
         </div>
       </div>
     </section>
     <div className="rounded-xl border border-slate-200 bg-white p-4">
       <h3 className="mb-3 text-sm font-bold text-slate-800">Last 6 months · Net received</h3>
       <div className="space-y-3">
         {data.months.map(row=><div key={row.month} className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-2 text-xs sm:grid-cols-[100px_minmax(0,1fr)_110px]">
           <span className="font-medium text-gray-600">{monthLabel(row.month)}</span>
           <div className="h-3 overflow-hidden rounded-full bg-pink-50" role="img" aria-label={monthLabel(row.month)+': net '+money(row.net)}>
             <div className={cn('h-full rounded-full transition-[width]',row.net<0?'bg-red-500':'bg-pink-600')}
               style={{width:Math.max(0,Math.min(100,Math.abs(row.net)/max*100))+'%'}}/>
           </div>
           <span className="text-right font-semibold tabular-nums">{money(row.net)}</span>
         </div>)}
       </div>
     </div>
     <div className="rounded-xl border border-slate-200 bg-white">
       <div className="border-b border-slate-100 px-4 py-3">
         <h3 className="text-sm font-bold text-slate-800">Recent verified money activity</h3>
         <p className="text-[11px] text-gray-500">কখন, কোন সার্ভিস থেকে এবং কীভাবে টাকা এসেছে বা Refund হয়েছে—সর্বশেষ ২৫টি event।</p>
       </div>
       {data.recent.length===0?<p className="px-4 py-5 text-sm text-gray-500">No confirmed payment activity found.</p>:
         <div className="overflow-x-auto">
           <table className="w-full min-w-[720px] text-left text-[12px]">
             <thead className="bg-slate-50 text-slate-600"><tr>
               <th scope="col" className="px-3 py-2 font-semibold">Bangladesh time</th>
               <th scope="col" className="px-3 py-2 font-semibold">Order</th>
               <th scope="col" className="px-3 py-2 font-semibold">Service</th>
               <th scope="col" className="px-3 py-2 font-semibold">Method</th>
               <th scope="col" className="px-3 py-2 font-semibold">Event</th>
               <th scope="col" className="px-3 py-2 text-right font-semibold">Amount</th>
             </tr></thead>
             <tbody className="divide-y divide-slate-100">
               {data.recent.map((entry,i)=><tr key={entry.id+'-'+entry.event+'-'+entry.at+'-'+i} className="hover:bg-slate-50">
                 <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                   {new Date(entry.at).toLocaleString('en-BD',{timeZone:'Asia/Dhaka',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                 </td>
                 <td className="max-w-[150px] truncate px-3 py-2.5 font-mono" title={entry.id}>{entry.id||'—'}</td>
                 <td className="px-3 py-2.5">{entry.source==='premium'?'Premium':'Connections'}</td>
                 <td className="px-3 py-2.5">{entry.method}</td>
                 <td className={cn('px-3 py-2.5 font-medium',entry.event==='refund'?'text-red-700':'text-emerald-700')}>
                   {entry.event==='refund'?'Refund recorded':'Paid'}
                 </td>
                 <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums',entry.event==='refund'?'text-red-700':'text-slate-900')}>
                   {entry.event==='refund'?'-':''}{money(entry.amount)}
                 </td>
               </tr>)}
             </tbody>
           </table>
         </div>}
       </div>
     {(data.missingPaidDates>0||data.missingRefundDates>0)&&<div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
       <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
       <span>Some historic transactions have no confirmed timestamp: {data.missingPaidDates} payment(s), {data.missingRefundDates} refund(s). They are not added to the reported totals until reconciled.</span>
     </div>}
     <p className="rounded-lg bg-white px-3 py-3 text-[12px] leading-5 text-gray-600"><strong>Note:</strong> Net receipts = verified paid order amount − recorded refunds. এটি <strong>profit নয়</strong>; bKash charges, taxes, operating expenses এবং অন্য ব্যাংক সমন্বয় এখানে বাদ দেওয়া হয়নি। Premium application বা manual request নিজে payment নয়; matching score ও available connection credit-ও আয় নয়।</p>
   </>}
 </section>;
}
