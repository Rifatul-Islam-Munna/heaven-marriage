'use client';
import {useState} from 'react';
import {BadgeCheck,Check,Gift,Search,ShieldCheck,Save,RefreshCw,Plus} from 'lucide-react';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import {PatchRequestAxios,PostRequestAxios} from '@/api-hooks/api-hooks';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';

type Service={source?:string;stage?:string;startedAt?:string;expiresAt?:string;
 assistedAllowance?:number;assistedUsed?:number;includedConnections?:number;adminNotes?:string};
type Member={id:string;name:string;userId?:string;email?:string;phoneNumber?:string;active:boolean;
 published:boolean;service?:Service|null;connectionsRemaining:number;
 onlineRecommendations:number;offlineRecommendations:number;totalRecommendations:number};
type Members={members:Member[];total:number;page:number;limit:number};
const stages=['onboarding','preferences','shortlisting','connecting','completed','paused'];
const field='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-2 focus:outline-pink-500';
const date=(x?:string)=>x?new Date(x).toLocaleDateString('en-BD',{timeZone:'Asia/Dhaka'}):'Not set';
export default function PremiumMembersPanel(){
 const [search,setSearch]=useState(''),[term,setTerm]=useState(''),[page,setPage]=useState(1);
 const [selected,setSelected]=useState<Member|null>(null);
 const [reason,setReason]=useState(''),[stage,setStage]=useState('onboarding');
 const [used,setUsed]=useState(0),[notes,setNotes]=useState(''),[expiry,setExpiry]=useState('');
 const [offlineCount,setOfflineCount]=useState(0);
 const [credits,setCredits]=useState(0),[busy,setBusy]=useState(false);
 const {data,refetch,isLoading}=useQueryWrapper<Members>(['premium-member-list',term,page],
   '/platform/admin/premium-members?q='+encodeURIComponent(term)+'&page='+page,{staleTime:15000});
 const choose=(m:Member)=>{
   setSelected(m);setReason('');setCredits(0);
   setStage(m.service?.stage||'onboarding');setUsed(m.service?.assistedUsed||0);
   setNotes(m.service?.adminNotes||'');
   setOfflineCount(m.offlineRecommendations||0);
   setExpiry(m.service?.expiresAt?new Date(m.service.expiresAt).toISOString().slice(0,10):'');
 };
 const refresh=()=>{void refetch();};
 const save=async(payload:Record<string,unknown>,ok:string)=>{
   if(!selected||reason.trim().length<6){toast.error('Please enter an admin reason of at least 6 characters');return;}
   setBusy(true);
   try{
     const [result,error]=await PatchRequestAxios('/platform/admin/premium-members/'+selected.id,
       {...payload,reason:reason.trim()});
     if(error||!result)throw Error(error?.message||'Could not update membership');
     toast.success(ok);refresh();setSelected(null);
   }catch(error){toast.error(error instanceof Error?error.message:'Update failed');}finally{setBusy(false);}
 };
 const addCredits=async()=>{
   if(!selected||credits<1||credits>10000||reason.trim().length<6){toast.error('Add a valid quantity and reason');return;}
   setBusy(true);
   try{
     const [result,error]=await PostRequestAxios('/platform/admin/adjust-connections/'+selected.id,{
       amount:credits,reason:reason.trim(),requestId:crypto.randomUUID(),
     });
     if(error||!result)throw Error(error?.message||'Connection grant failed');
     toast.success('Wallet connection credits granted (not a payment)');refresh();setSelected(null);
   }catch(error){toast.error(error instanceof Error?error.message:'Grant failed');}finally{setBusy(false);}
 };
 return <section className="space-y-4 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><BadgeCheck className="size-5 text-blue-600"/> Premium members & service progress</h2>
      <p className="mt-1 text-xs leading-5 text-slate-600">Active, expired and paused membership. Search any Member ID to grant an explicit manual Premium badge. Account payments are never created by an admin grant.</p>
    </div>
    <button type="button" onClick={refresh} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw size={13}/> Refresh</button>
   </div>
   <form className="flex gap-2" onSubmit={event=>{event.preventDefault();setTerm(search.trim());setPage(1);setSelected(null)}}>
    <label className="relative flex-1"><span className="sr-only">Search Premium members or any Member ID</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
     <input value={search} maxLength={80} onChange={e=>setSearch(e.target.value)}
       placeholder="Search name, Member ID, email or phone" className={cn(field,'pl-9')}/></label>
    <button type="submit" className="rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Search</button>
    {term&&<button type="button" className="rounded-lg border px-3 text-sm" onClick={()=>{setSearch('');setTerm('');setPage(1)}}>Clear</button>}
   </form>
   <div className="overflow-x-auto rounded-lg border border-slate-100">
    <table className="w-full min-w-[840px] text-left text-[12px]">
     <thead className="bg-slate-50"><tr>{['Member','Premium badge','Service stage','Recommendations sent','Assisted','Expires','Wallet','Action'].map(head=><th key={head} className="px-3 py-3 font-semibold">{head}</th>)}</tr></thead>
     <tbody className="divide-y divide-slate-100">
      {isLoading&&!data?<tr><td colSpan={8} className="px-4 py-6 text-center">Loading members…</td></tr>:
       !data?.members.length?<tr><td colSpan={8} className="px-4 py-6 text-center">No matching members</td></tr>:
       data.members.map(m=><tr key={m.id} className="hover:bg-slate-50">
         <td className="px-3 py-2.5"><p className="font-semibold text-slate-900">{m.name||'Member'}</p><p className="font-mono text-[11px] text-slate-500">#{m.userId||m.id}</p></td>
         <td className="px-3 py-2.5">{m.active?<span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-800"><BadgeCheck size={13}/> Active</span>:
           <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Inactive / expired</span>}</td>
         <td className="px-3 py-2.5 capitalize">{m.service?.stage||'Legacy / no service record'}</td>
         <td className="px-3 py-2.5 tabular-nums">
           <p className="text-sm font-bold text-pink-700">{m.totalRecommendations??0} total</p>
           <p className="text-[11px] text-slate-500">Online {m.onlineRecommendations??0} · Offline {m.offlineRecommendations??0}</p>
         </td>
         <td className="px-3 py-2.5 tabular-nums">{m.service?.assistedUsed||0}/{m.service?.assistedAllowance??'—'}</td>
         <td className="whitespace-nowrap px-3 py-2.5">{date(m.service?.expiresAt)}</td>
         <td className="px-3 py-2.5">{m.connectionsRemaining}</td>
         <td className="px-3 py-2.5"><button type="button" onClick={()=>choose(m)} className="rounded-lg border border-blue-200 px-2 py-1.5 font-semibold text-blue-700 hover:bg-blue-50">Manage</button></td>
       </tr>)}
     </tbody>
    </table>
   </div>
   {!!data?.total&&<div className="flex items-center justify-between text-xs text-slate-500">
     <span>{data.total} members · page {data.page}</span>
     <div className="flex gap-2">
       <button type="button" disabled={page<=1} className="rounded border px-3 py-1.5 disabled:opacity-30" onClick={()=>setPage(x=>x-1)}>Previous</button>
       <button type="button" disabled={page*data.limit>=data.total} className="rounded border px-3 py-1.5 disabled:opacity-30" onClick={()=>setPage(x=>x+1)}>Next</button>
     </div>
   </div>}
   {selected&&<div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4" aria-label="Edit Premium member">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <div><h3 className="text-sm font-bold text-slate-900">Manage {selected.name}</h3><p className="text-xs text-slate-600">Online recommendations, offline records, assisted connections and wallet credits are tracked separately. Changes require an audit reason.</p></div>
       <button type="button" onClick={()=>setSelected(null)} className="rounded-lg border px-3 py-1.5 text-xs">Close</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
       <label className="text-xs font-semibold">Service stage
        <select className={field} value={stage} onChange={e=>setStage(e.target.value)}>{stages.map(s=><option key={s} value={s}>{s}</option>)}</select>
       </label>
       <label className="text-xs font-semibold">Assisted connections used (allowance {selected.service?.assistedAllowance??0})
        <input type="number" inputMode="numeric" min={0} max={selected.service?.assistedAllowance??0} value={used}
          onChange={e=>setUsed(Number(e.target.value))} className={field}/>
       </label>
       <label className="text-xs font-semibold">Membership expiry date
        <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className={field}/>
       </label>
      </div>
      <div className="rounded-xl border border-pink-100 bg-white p-3">
        <h4 className="text-sm font-bold text-slate-900">Agency recommendations sent to this member</h4>
        <p className="mt-1 text-[11px] leading-5 text-slate-600">Online recommendations are counted automatically, including ones the member hides. Enter only additional recommendations sent offline. This does not alter Premium assisted connections or wallet credits.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-pink-50 p-3"><p className="text-[11px] text-pink-800">Online (automatic)</p><p className="mt-1 text-xl font-bold tabular-nums text-pink-800">{selected.onlineRecommendations??0}</p></div>
          <label className="text-[11px] font-semibold text-slate-700">Offline (admin editable)
            <input type="number" min={0} max={1000000} step={1} inputMode="numeric" value={offlineCount}
              onChange={event=>setOfflineCount(Number(event.target.value))} className={cn(field,'mt-1')} />
          </label>
          <div className="rounded-lg bg-slate-100 p-3"><p className="text-[11px] text-slate-700">Combined total</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{(selected.onlineRecommendations??0)+offlineCount}</p></div>
        </div>
        <button type="button" disabled={busy || offlineCount===selected.offlineRecommendations}
          onClick={()=>void save({offlineRecommendations:offlineCount},'Offline recommendation count saved')}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-pink-600 px-4 text-xs font-semibold text-white hover:bg-pink-700 disabled:opacity-40">
          <Save size={14}/> Save offline recommendation count
        </button>
      </div>
      <label className="block text-xs font-semibold">Team notes (private, never public)
       <textarea rows={3} maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)} className={field}/></label>
      <label className="block text-xs font-semibold">Why is Admin changing this? (audit log)
        <input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}
          placeholder="e.g. Member called, approved by team" className={field}/></label>
      <div className="flex flex-wrap gap-2">
       {(!selected.active||!selected.service)&&<button type="button" disabled={busy} onClick={()=>void save({activate:true},'Premium badge and service activated manually')}
         className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"><ShieldCheck size={14}/> Activate blue badge (manual)</button>}
       {selected.active&&<button type="button" disabled={busy} onClick={()=>void save({activate:false},'Premium deactivated')}
         className="rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50">Deactivate membership</button>}
       {selected.service&&<button type="button" disabled={busy} onClick={()=>void save({stage,assistedUsed:used,adminNotes:notes,...(expiry?{expiresAt:new Date(expiry+'T23:59:59+06:00').toISOString()}:{})},'Service progress updated')}
         className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"><Save size={14}/> Save progress</button>}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-blue-100 pt-3">
       <label className="text-xs font-semibold">Add wallet connection credits (separate from assisted count)
        <input type="number" inputMode="numeric" min={1} max={10000} value={credits||''} onChange={e=>setCredits(Number(e.target.value))}
          placeholder="Quantity" className={cn(field,'max-w-44')}/></label>
       <button type="button" disabled={busy||credits<1||!reason.trim()} onClick={()=>void addCredits()}
         className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 text-xs font-semibold text-blue-800 disabled:opacity-40"><Plus size={14}/> Grant credits</button>
       <p className="text-[11px] text-gray-600">This is a free admin adjustment—not income and not a bKash transaction.</p>
      </div>
   </div>}
 </section>;
}
