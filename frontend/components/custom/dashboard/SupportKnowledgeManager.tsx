'use client';
import {useState} from 'react';
import {Bot,BookOpen,Plus,Save,Trash2,RefreshCw,Pencil,CheckCircle2,ShieldAlert} from 'lucide-react';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import {DeleteRequestAxios,PatchRequestAxios,PostRequestAxios} from '@/api-hooks/api-hooks';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';

type Article={id:string;question:string;answer:string;category:string;keywords:string[];enabled:boolean;updatedAt:string};
const fresh=()=>({question:'',answer:'',category:'general',keywords:'',enabled:true});
const control='w-full rounded-lg border border-pink-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-pink-500 focus:outline-2 focus:outline-pink-500';
export default function SupportKnowledgeManager(){
 const {data,refetch,isLoading}=useQueryWrapper<Article[]>(['support-articles'],'/support/admin/articles',{staleTime:15000});
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState(fresh);
 const [busy,setBusy]=useState(false);
 const [deleteId,setDeleteId]=useState<string|null>(null);
 const article=data?.find(a=>a.id===editing);
 const change=<K extends keyof ReturnType<typeof fresh>>(key:K,value:ReturnType<typeof fresh>[K])=>
   setForm(old=>({...old,[key]:value}));
 const edit=(a:Article)=>{
   setEditing(a.id);
   setForm({question:a.question,answer:a.answer,category:a.category,
     keywords:a.keywords.join(', '),enabled:a.enabled});
 };
 const save=async()=>{
   if(form.question.trim().length<5||form.answer.trim().length<5){toast.error('Question and answer need at least 5 characters');return;}
   setBusy(true);
   const payload={...form,keywords:form.keywords.split(',').map(x=>x.trim()).filter(Boolean)};
   try{
     const [result,error]=editing?await PatchRequestAxios('/support/admin/articles/'+editing,payload):
       await PostRequestAxios('/support/admin/articles',payload);
     if(error||!result)throw Error(error?.message||'Save failed');
     toast.success('Support knowledge saved. It is now available to the chatbot.');
     setForm(fresh());setEditing(null);void refetch();
   }catch(error){toast.error(error instanceof Error?error.message:'Save failed');}finally{setBusy(false);}
 };
 const remove=async(id:string)=>{
   setBusy(true);
   try{
     const [result,error]=await DeleteRequestAxios('/support/admin/articles/'+id);
     if(error||!result)throw Error(error?.message||'Delete failed');
     toast.success('Knowledge item deleted');
     if(editing===id){setEditing(null);setForm(fresh());}
     void refetch();setDeleteId(null);
   }catch(error){toast.error(error instanceof Error?error.message:'Delete failed');}finally{setBusy(false);}
 };
 return <section className="mb-8 space-y-4 rounded-xl border border-pink-200 bg-gradient-to-b from-pink-50/60 to-white p-4 sm:p-6" id="support-training">
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div>
       <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Bot className="size-6 text-pink-700"/> AI Customer Support · Knowledge Base</h2>
       <p className="mt-2 max-w-3xl text-[13px] leading-6 text-gray-700">Chatbot-কে শেখাতে এখানে প্রশ্ন ও সঠিক উত্তর যোগ করুন। এটি Model fine-tuning নয়; Admin-approved তথ্য থেকে AI উত্তর তৈরি করে। FAQ, Guidelines এবং সাইটের মূল তথ্য স্বয়ংক্রিয়ভাবে ব্যবহার করে।</p>
       <p className="mt-1 text-xs font-medium text-pink-800">শুধু Niqaha বিষয়ক প্রশ্ন, প্রতি visitor ২৪ ঘণ্টায় সর্বোচ্চ ১০টি প্রশ্ন। অন্য বিষয়ে AI উত্তর দেবে না।</p>
      </div>
      <button type="button" onClick={()=>void refetch()} className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-white px-3 py-2 text-xs font-semibold text-pink-700"><RefreshCw size={14}/> Refresh</button>
    </header>
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-4 rounded-xl border border-pink-100 bg-white p-4">
       <div className="flex items-center justify-between gap-3">
         <h3 className="flex items-center gap-2 text-base font-semibold">{editing?<><Pencil size={16}/> Edit saved knowledge</>:<><Plus size={16}/> Add a question & answer</>}</h3>
         {editing&&<button type="button" className="text-xs font-semibold text-pink-700 underline" onClick={()=>{setEditing(null);setForm(fresh())}}>Create new instead</button>}
       </div>
       <label className="block text-xs font-semibold">Customer question (any natural language)
         <input value={form.question} onChange={e=>change('question',e.target.value)} maxLength={300}
           className={control} placeholder="যেমন: শুক্রবার কি অফিসে কল করতে পারব?"/></label>
       <label className="block text-xs font-semibold">Approved answer · Only verified business information
         <textarea rows={5} value={form.answer} onChange={e=>change('answer',e.target.value)} maxLength={3000}
           className={cn(control,'resize-y')} placeholder="শুক্রবার অফিস বন্ধ থাকে। জরুরি প্রয়োজনে…"/></label>
       <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">Topic / Category
         <select className={control} value={form.category} onChange={e=>change('category',e.target.value)}>
           {['general','contact','premium','signup','biodata','connection','guidelines','faq'].map(x=><option key={x} value={x}>{x}</option>)}
         </select></label>
        <label className="block text-xs font-semibold">Alternative keywords (comma separated)
         <input value={form.keywords} maxLength={600} onChange={e=>change('keywords',e.target.value)}
           className={control} placeholder="office, phone, অফিস, কল"/></label>
       </div>
       <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
         <input type="checkbox" checked={form.enabled} onChange={e=>change('enabled',e.target.checked)}
           className="size-4 accent-pink-600"/> Enabled for chatbot answers
       </label>
       <div className="flex flex-wrap gap-2">
         <button type="button" disabled={busy||form.question.trim().length<5||form.answer.trim().length<5}
           onClick={()=>void save()} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-40">
           <Save size={16}/>{busy?'Saving...':editing?'Update & Publish answer':'Save & Publish answer'}
         </button>
         {editing&&<button type="button" onClick={()=>{setEditing(null);setForm(fresh())}} className="rounded-lg border px-3 text-sm font-semibold">Cancel</button>}
       </div>
       <p className="text-[11px] leading-5 text-gray-500"><ShieldAlert size={13} className="mr-1 inline"/> Do not upload personal customer data, government ID numbers, passwords or OTPs. Knowledge text is public information once enabled.</p>
      </div>
      <div className="rounded-xl border border-pink-100 bg-white p-4">
       <h3 className="flex items-center gap-2 text-base font-semibold"><BookOpen size={16}/> Saved Knowledge ({data?.length||0})</h3>
       <p className="mt-1 text-xs text-gray-500">Your extra Q&A improves recognition of informal wording. Automatic FAQ/Guidelines remain available separately.</p>
       <div className="mt-3 max-h-[490px] space-y-2 overflow-y-auto">
        {isLoading&&!data&&<p className="py-4 text-center text-sm">Loading…</p>}
        {!data?.length&&!isLoading&&<p className="py-4 text-center text-sm text-gray-500">No custom Q&A yet. Start with one common customer question.</p>}
        {data?.map(a=><div key={a.id} className={cn('rounded-xl border p-3',editing===a.id?'border-pink-400 bg-pink-50':'border-slate-100')}>
          <div className="flex items-start justify-between gap-2">
           <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900">{a.question}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{a.answer}</p>
            <span className={cn('mt-1 inline-flex items-center gap-1 text-[11px] font-medium',a.enabled?'text-emerald-700':'text-amber-700')}>
             {a.enabled&&<CheckCircle2 size={12}/>} {a.enabled?'Published':'Hidden'} · {a.category}</span>
           </div>
           <div className="flex shrink-0 gap-1">
             <button type="button" title="Edit knowledge" onClick={()=>edit(a)} className="rounded-lg border p-2 text-pink-700 hover:bg-pink-50"><Pencil size={14}/></button>
             <button type="button" title="Delete knowledge" onClick={()=>setDeleteId(a.id)} className="rounded-lg border p-2 text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
           </div>
          </div>
          {deleteId===a.id&&<div className="mt-2 flex items-center gap-2 border-t pt-2 text-xs">
            <span className="flex-1">Delete this approved answer?</span>
            <button type="button" disabled={busy} onClick={()=>void remove(a.id)} className="rounded bg-red-600 px-2 py-1.5 font-semibold text-white">Confirm delete</button>
            <button type="button" onClick={()=>setDeleteId(null)} className="rounded border px-2 py-1.5">Cancel</button>
          </div>}
        </div>)}
       </div>
      </div>
    </div>
  </section>;
}
