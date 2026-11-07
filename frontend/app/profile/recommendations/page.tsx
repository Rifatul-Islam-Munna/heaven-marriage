"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {useQueryWrapper} from "@/api-hooks/react-query-wrapper";
import {PatchRequestAxios} from "@/api-hooks/api-hooks";
import {toast} from "sonner";
import {ArrowLeft,HeartHandshake,Loader2,Trash2,Eye,ShieldCheck} from "lucide-react";
import {
  AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,
  AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Recommendation={
  profile:{
    _id:string;userId?:string;age?:number;gender?:string;
    maritalStatus?:string;address?:{district?:string};
  };
  createdAt:string;
};
type RecommendationResponse={recommendations:Recommendation[]};

export default function RecommendationsPage(){
  const {data,isPending,isError,refetch}=useQueryWrapper<RecommendationResponse>(
    ["my-recommendations"],"/platform/recommendations",{staleTime:30000,retry:false});
  const [selected,setSelected]=useState<string|null>(null);
  const [removing,setRemoving]=useState(false);
  const [hiddenIds,setHiddenIds]=useState<Set<string>>(()=>new Set());
  const visible=useMemo(()=>(data?.recommendations??[])
    .filter(item=>!hiddenIds.has(item.profile._id)),[data,hiddenIds]);

  const dismiss=async()=>{
    if(!selected||removing)return;
    setRemoving(true);
    try{
      const [response,error]=await PatchRequestAxios<{message:string}>(
        "/platform/recommendations/"+encodeURIComponent(selected)+"/dismiss",{});
      if(error||!response){
        toast.error(error?.message||"সুপারিশ সরানো যায়নি। আবার চেষ্টা করুন।");
        return;
      }
      setHiddenIds(previous=>new Set([...previous,selected]));
      setSelected(null);
      toast.success("সুপারিশটি আপনার তালিকা থেকে সরানো হয়েছে।");
      void refetch();
    }catch(error){
      toast.error(error instanceof Error?error.message:"সুপারিশ সরানো যায়নি।");
    }finally{
      setRemoving(false);
    }
  };

  return <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8">
    <Link href="/profile/matches" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-pink-700 hover:text-pink-800">
      <ArrowLeft size={16}/> স্মার্ট ম্যাচিং-এ ফিরে যান
    </Link>

    <header className="rounded-2xl border border-pink-100 bg-pink-50 p-4 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">Agency recommendations</p>
      <h1 className="mt-2 flex items-start gap-2 text-xl font-bold leading-snug text-slate-900 sm:items-center sm:text-2xl">
        <HeartHandshake className="mt-0.5 size-6 shrink-0 text-pink-700 sm:mt-0"/>
        আপনার জন্য এজেন্সির সুপারিশ
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        এখানে অ্যাডমিনের বাছাই করা প্রকাশিত বায়োডাটা পাবেন। যেটি আর দেখতে চান না, সেটি নিজের তালিকা থেকে সরাতে পারবেন।
        সুপারিশ মানেই পারস্পরিক সম্মতি বা বিয়ের নিশ্চয়তা নয়।
      </p>
      {!isPending&&!isError&&<div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-pink-700">
        <ShieldCheck size={14}/> আপনার তালিকায় {visible.length}টি সুপারিশ
      </div>}
    </header>

    {isPending&&<div role="status" className="flex items-center gap-2 rounded-xl border bg-white p-5 text-sm text-slate-600">
      <Loader2 className="size-4 animate-spin"/> সুপারিশ লোড হচ্ছে…
    </div>}
    {isError&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      সুপারিশ লোড হয়নি। <button type="button" className="font-semibold underline" onClick={()=>void refetch()}>আবার চেষ্টা করুন</button>
    </div>}
    {!isPending&&!isError&&!visible.length&&<div className="rounded-xl border bg-white p-8 text-center text-sm leading-6 text-slate-600">
      এখন আপনার তালিকায় কোনো এজেন্সি সুপারিশ নেই।
    </div>}

    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(item=><article key={item.profile._id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold text-pink-700">এজেন্সি সুপারিশ</p>
        <h2 className="mt-1 break-words text-lg font-bold text-slate-900 sm:text-xl">
          বায়োডাটা #{item.profile.userId||item.profile._id}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {item.profile.age||"—"} বছর · {item.profile.maritalStatus||"অবস্থা নেই"} · {item.profile.address?.district||"জেলা নেই"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          প্রথম সুপারিশ: {new Date(item.createdAt).toLocaleString("bn-BD")}
        </p>
        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-5">
          <Link href={`/biodata/${item.profile._id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">
            <Eye size={16}/> বায়োডাটা দেখুন
          </Link>
          <button type="button" onClick={()=>setSelected(item.profile._id)}
            aria-label={`বায়োডাটা ${item.profile.userId||item.profile._id} সুপারিশ সরান`}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
            <Trash2 size={16}/> সরান
          </button>
        </div>
      </article>)}
    </div>

    <AlertDialog open={selected!==null} onOpenChange={open=>{if(!open&&!removing)setSelected(null);}}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>সুপারিশটি সরাতে চান?</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            এটি শুধু আপনার তালিকা থেকে সরবে। অন্য সদস্যের সুপারিশ, এজেন্সির পাঠানোর হিসাব এবং কোনো সংযোগ ক্রেডিট পরিবর্তন হবে না।
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>বাতিল</AlertDialogCancel>
          <button type="button" disabled={removing} onClick={()=>void dismiss()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            {removing&&<Loader2 size={15} className="animate-spin"/>} তালিকা থেকে সরান
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>;
}
