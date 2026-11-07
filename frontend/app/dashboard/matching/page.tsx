"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { PostRequestAxios, GetRequestNormal } from "@/api-hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, CircleHelp, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, Send, Share2, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
type Criterion = {key:string;label:string;expected:string;actual:string|null;status:"matched"|"mismatched"|"unknown"};
type Direction = {score:number|null;coverage:number;criteria:Criterion[]};
type Match = { profile:{_id:string;userId?:string;gender?:string;age?:number;address?:{district?:string};maritalStatus?:string};
  score:number|null;coverage:number;forward:Direction;reverse:Direction};
type Result = {source:{_id:string;name:string;userId:string};profiles:Match[];total:number;page:number;limit:number;message:string};
type AdminMember = {_id:string;name:string;userId:string};
type SearchResults = {data:AdminMember[]};
function Details({heading,direction}:{heading:string;direction:Direction}){
  return <section className="space-y-2"><h4 className="font-semibold text-slate-800">{heading} · {direction.score ?? "—"}%</h4>
    {direction.criteria.map(c=><div key={c.key} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-sm">
      {c.status==="matched"?<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600"/>:c.status==="unknown"?
        <CircleHelp className="mt-0.5 size-4 shrink-0 text-amber-600"/>:<XCircle className="mt-0.5 size-4 shrink-0 text-rose-600"/>}
      <div><strong>{c.label}</strong><p className="text-slate-600">প্রত্যাশা: {c.expected}</p>
        <p className="text-slate-600">বাস্তব তথ্য: {c.actual??"তথ্য নেই"}</p></div>
    </div>)}
    {!direction.criteria.length&&<p className="text-sm text-amber-700">এই সদস্যের তুলনাযোগ্য প্রত্যাশা নেই।</p>}
  </section>;
}
export default function AdminMatchingPage(){
  const params=useSearchParams();
  const queryClient=useQueryClient();
  const [typed,setTyped]=useState(params.get("member")||"");
  const [selected,setSelected]=useState(params.get("member")||"");
  const [page,setPage]=useState(1);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [sending,setSending]=useState<string|null>(null);
  const [lookup,setLookup]=useState("");
  const {data,isFetching,isError,refetch}=useQueryWrapper<Result>(
    ["admin-reciprocal-matches",selected,page],
    `/platform/admin/matches?member=${encodeURIComponent(selected)}&page=${page}&limit=12`,
    {enabled:!!selected,retry:false,staleTime:30_000});
  const {data:members}=useQueryWrapper<SearchResults>(["matching-member-search",lookup],
    `/user/get-all-user-for-admin?page=1&limit=15&query=${encodeURIComponent(lookup)}`,
    {enabled:lookup.length>=2,retry:false});
  const search=()=>{setSelected(typed.trim());setLookup("");setPage(1);setExpanded(null);};
  const recommend=async(match:Match,recipientScope:"source"|"both")=>{
    if(!data?.source._id || sending)return;
    setSending(match.profile._id+":"+recipientScope);
    try{
      const [result,error]=await PostRequestAxios<{message:string;smsSent?:number;smsFailed?:number}>("/platform/admin/recommend",
        {memberId:data.source._id,candidateId:match.profile._id,recipientScope});
      if(error||!result)toast.error(error?.message||"Recommendation পাঠানো যায়নি");
      else{
        toast.success((recipientScope==="source"
          ? "শুধু খোঁজা সদস্যের অ্যাকাউন্টে সুপারিশ যোগ হয়েছে"
          : "উভয় সদস্যের অ্যাকাউন্টে Recommendation যোগ হয়েছে")+
          (result.smsSent ? ` · ${result.smsSent}টি Premium SMS পাঠানো হয়েছে` : ""));
        if(result.smsFailed)toast.warning(`${result.smsFailed}টি Premium SMS পাঠানো যায়নি — SMS provider পরীক্ষা করুন`);
        void queryClient.invalidateQueries({queryKey:["my-recommendations"]});
      }
    }catch(error){
      toast.error(error instanceof Error?error.message:"Recommendation পাঠানো যায়নি");
    }finally{setSending(null);}
  };
  const share=async(match:Match,recipient:"source"|"candidate")=>{
    if(!data?.source._id)return;
    try{
      const recipientId=recipient==="source"?data.source._id:match.profile._id;
      const suggestedId=recipient==="source"?match.profile._id:data.source._id;
      const member=await GetRequestNormal<{phoneNumber?:string;whatsapp?:string}>(
        `/user/get-user-profile-admin?id=${recipientId}`);
      const number=member.whatsapp||member.phoneNumber;
      if(!number){toast.error("এই সদস্যের WhatsApp নম্বর নেই");return;}
      const normalized=number.replace(/[^0-9]/g,"").replace(/^0/,"880");
      const url=`${window.location.origin}/biodata/${suggestedId}`;
      window.open(`https://wa.me/${normalized}?text=${encodeURIComponent("আপনার জন্য প্রস্তাবিত বায়োডাটা: "+url)}`,"_blank","noopener,noreferrer");
    }catch{toast.error("WhatsApp শেয়ার প্রস্তুত করা যায়নি");}
  };
  return <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-pink-700"><ArrowLeft size={16}/> সদস্য তালিকায় ফিরে যান</Link>
    <header className="rounded-2xl bg-[#1a1a2e] p-5 text-white sm:p-7">
      <p className="flex items-center gap-2 text-sm font-semibold text-pink-300"><Sparkles size={17}/> Admin Smart Matching</p>
      <h1 className="mt-2 text-2xl font-bold">দুই পক্ষের পছন্দ মিলিয়ে স্মার্ট ম্যাচিং</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/75">বায়োডাটা নম্বর, ফোন বা ইমেইল দিয়ে সদস্য খুঁজুন। উভয়ের প্রকাশযোগ্য তথ্য ও জীবনসঙ্গীর প্রত্যাশা মিলিয়ে স্কোর বের হবে। স্কোর বিয়ের নিশ্চয়তা নয়।</p>
      <form className="mt-5 flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();search();}}>
        <input className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-900 sm:min-w-[260px]"
          value={typed} onChange={e=>{setTyped(e.target.value);setLookup(e.target.value)}} placeholder="Member ID, Biodata নম্বর, ফোন বা ইমেইল" aria-label="Member ID, phone or email"/>
        <Button type="submit" className="bg-pink-600 text-white hover:bg-pink-700"><Search size={16}/> ম্যাচ দেখুন</Button>
      </form>
      {!!members?.data?.length&&<div className="mt-2 flex flex-wrap gap-2">{members.data.map(m=><button key={m._id}
        className="rounded-full border border-white/25 px-3 py-1.5 text-xs hover:bg-white/15"
        onClick={()=>{setTyped(m._id);setSelected(m._id);setLookup("");setPage(1)}}>{m.name} · #{m.userId}</button>)}</div>}
    </header>
    {selected&&isFetching&&!data&&<p className="flex items-center gap-2"><Loader2 className="animate-spin"/> মিল খোঁজা হচ্ছে…</p>}
    {selected&&isError&&<div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">মেম্বার পাওয়া যায়নি অথবা ম্যাচিং চালানো যাচ্ছে না। সদস্যের ID ও লিঙ্গ যাচাই করুন। <Button variant="outline" onClick={()=>void refetch()}>আবার চেষ্টা করুন</Button></div>}
    {data&&<><div className="flex items-center justify-between gap-2"><p className="text-sm text-slate-700">সদস্য: <strong>{data.source.name} · #{data.source.userId}</strong> · মোট {data.total}টি দুই-মুখী ম্যাচ</p><Button variant="outline" size="sm" onClick={()=>void refetch()}>রিফ্রেশ</Button></div>
      {!data.profiles.length&&<p className="rounded-xl border bg-white p-8 text-center text-slate-600">উভয় পক্ষের তুলনাযোগ্য পছন্দ সহ প্রকাশিত বায়োডাটা পাওয়া যায়নি।</p>}
      <div className="grid gap-4 lg:grid-cols-2">{data.profiles.map(m=><article key={m.profile._id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">বায়োডাটা #{m.profile.userId||m.profile._id}</h2>
          <p className="mt-1 text-sm text-slate-600">{m.profile.age||"—"} বছর · {m.profile.address?.district||"জেলা নেই"} · {m.profile.maritalStatus||"অবস্থা নেই"}</p></div>
          <div className="rounded-xl bg-pink-50 px-4 py-2 text-center text-pink-800"><p className="text-2xl font-bold">{m.score??"—"}%</p><p className="text-xs">দুই পক্ষের মিল</p></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-3"><strong>{m.forward.score??"—"}%</strong><p className="text-slate-600">প্রথম সদস্যের চাহিদা</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><strong>{m.reverse.score??"—"}%</strong><p className="text-slate-600">অপর সদস্যের চাহিদা</p></div></div>
        <p className="mt-2 text-xs text-slate-500">তুলনাযোগ্য তথ্যের coverage: {m.coverage}% · অজানা তথ্যকে মিল ধরা হয়নি।</p>
        <button className="mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold"
          aria-expanded={expanded===m.profile._id} onClick={()=>setExpanded(expanded===m.profile._id?null:m.profile._id)}>
          কোন বিষয় মিলেছে বা মেলেনি? <ChevronDown size={16}/></button>
        {expanded===m.profile._id&&<div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Details heading="প্রথম সদস্যের প্রত্যাশা" direction={m.forward}/><Details heading="অপর সদস্যের প্রত্যাশা" direction={m.reverse}/></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={!!sending} onClick={()=>void recommend(m,"source")}
            title="শুধু উপরে সার্চ করা সদস্যকে এই বায়োডাটা পাঠাবে; অপর সদস্যকে পাঠাবে না"
            className="min-h-10 bg-[#1a1a2e] text-white hover:bg-[#32334c]">
            {sending===m.profile._id+":source"?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>} শুধু খোঁজা সদস্যকে Recommend
          </Button>
          <Button disabled={!!sending} onClick={()=>void recommend(m,"both")} className="min-h-10 bg-pink-600 text-white hover:bg-pink-700">
            {sending===m.profile._id+":both"?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>} উভয়কে Recommend
          </Button>
          <Button variant="outline" onClick={()=>void share(m,"source")}><Share2 size={15}/> প্রথম সদস্যকে WhatsApp</Button>
          <Button variant="outline" onClick={()=>void share(m,"candidate")}><Share2 size={15}/> অপর সদস্যকে WhatsApp</Button>
          <Button variant="outline" asChild><Link href={`/biodata/${m.profile._id}`} target="_blank">বায়োডাটা দেখুন</Link></Button></div>
      </article>)}</div>
      {data.total>data.limit&&<div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page===1||isFetching} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/> আগে</Button><span className="text-sm">{page} / {Math.ceil(data.total/data.limit)}</span><Button variant="outline" disabled={page*data.limit>=data.total||isFetching} onClick={()=>setPage(p=>p+1)}>পরে <ChevronRight size={16}/></Button></div>}
    </>}
  </main>;
}
