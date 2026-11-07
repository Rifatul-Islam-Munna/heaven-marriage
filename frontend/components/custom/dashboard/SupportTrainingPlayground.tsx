'use client';

import {useState} from 'react';
import {Bot,Send,Loader2,FlaskConical,ShieldAlert} from 'lucide-react';
import {toast} from 'sonner';
import {PostRequestAxios} from '@/api-hooks/api-hooks';

type PreviewReply={answer:string;remaining:number;sources?:{title:string;url:string}[]};
const examples=[
 'শুক্রবার কখন অফিসে কল করতে পারব?',
 'Premium Service-এ কী সুবিধা আছে?',
 'বায়োডাটা Submit করার পরে কী হয়?',
];
export default function SupportTrainingPlayground(){
 const [question,setQuestion]=useState('');
 const [reply,setReply]=useState<PreviewReply|null>(null);
 const [busy,setBusy]=useState(false);
 const run=async(value=question)=>{
   const q=value.trim();
   if(q.length<3||q.length>600)return;
   setQuestion(q);setBusy(true);setReply(null);
   try{
     const [data,error]=await PostRequestAxios<PreviewReply>('/support/admin/preview',{message:q});
     if(error||!data)throw new Error(error?.message||'AI preview is currently unavailable.');
     setReply(data);
   }catch(e){
     toast.error(e instanceof Error?e.message:'Unable to test answer');
   }finally{setBusy(false);}
 };
 return <section id="test-ai-answer" className="scroll-mt-6 overflow-hidden rounded-xl border border-blue-100 bg-white">
    <div className="border-b border-blue-100 bg-blue-50/50 p-5">
       <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FlaskConical className="size-5 text-blue-600"/> Test trained AI</h2>
       <p className="mt-1 text-xs leading-6 text-slate-600">Training Data Save করার পর এখানে স্বাভাবিক ভাষায় প্রশ্ন করুন। এটি Admin-only test; Public visitor-এর ১০টি প্রশ্নের কোটা কমবে না। Gemini চালু থাকলে AI-generated উত্তর তৈরি হতে পারে।</p>
    </div>
    <div className="space-y-4 p-5">
       <div className="flex flex-wrap gap-2">
         {examples.map(example=><button type="button" key={example} disabled={busy} onClick={()=>void run(example)}
           className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-left text-[12px] font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-50">{example}</button>)}
       </div>
       <form onSubmit={e=>{e.preventDefault();void run()}} className="flex flex-col gap-2 sm:flex-row sm:items-end">
         <label className="w-full flex-1">
           <span className="mb-1 block text-xs font-semibold text-slate-700">Type a customer question</span>
           <textarea rows={2} maxLength={600} disabled={busy} value={question} onChange={e=>setQuestion(e.target.value)}
             placeholder="উদাহরণ: বায়োডাটা Publish হওয়ার পরে কি Premium নেওয়া যাবে?"
             className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-2 focus:outline-blue-500"/>
         </label>
         <button type="submit" disabled={busy||question.trim().length<3}
           className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
           {busy?<Loader2 className="size-4 animate-spin"/>:<Send className="size-4"/>} Test Answer
         </button>
       </form>
       {reply&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-4" role="status" aria-live="polite">
         <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-800"><Bot className="size-4"/> AI Support Response</p>
         <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{reply.answer}</p>
         {!!reply.sources?.length&&<div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
           {reply.sources.filter(s=>s.url.startsWith('/')&&!s.url.startsWith('//')).map(source=>
             <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
               className="rounded-md bg-white px-2 py-1 text-xs font-medium text-blue-700 underline">{source.title}</a>)}
         </div>}
       </div>}
       <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
         <ShieldAlert className="mt-0.5 size-4 shrink-0"/> Training এখানে model fine-tuning নয়; Admin-approved প্রশ্ন-উত্তর, FAQ ও Guidelines থেকে তথ্য নিয়ে AI উত্তর তৈরি করে। Test response ভুল হলে নির্ভরযোগ্য তথ্য Edit করুন।
       </p>
    </div>
 </section>;
}
