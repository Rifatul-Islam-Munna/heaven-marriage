import {Bot,BookOpen,FlaskConical,ShieldCheck} from 'lucide-react';
import SupportKnowledgeManager from '@/components/custom/dashboard/SupportKnowledgeManager';
import SupportTrainingPlayground from '@/components/custom/dashboard/SupportTrainingPlayground';

export default function AiTrainingPage(){
 return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
   <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 px-6 py-7 text-white sm:px-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pink-200"><Bot className="size-4"/> AI Customer Support</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">AI Training Center</h1>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">
        FAQ থেকে সম্পূর্ণ আলাদা এই পেজে আপনার Customer Support AI-কে প্রশ্ন ও অনুমোদিত উত্তর শেখান, তথ্য পরিবর্তন করুন এবং উত্তর পরীক্ষা করুন।
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href="#support-training" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pink-600 px-4 text-xs font-semibold text-white hover:bg-pink-500"><BookOpen className="size-4"/> Add training content</a>
        <a href="#test-ai-answer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 px-4 text-xs font-semibold text-white hover:bg-white/10"><FlaskConical className="size-4"/> Test AI response</a>
      </div>
   </header>
   <section className="grid gap-3 md:grid-cols-3" aria-label="AI training workflow">
     {[
       {step:'01',title:'Add knowledge',detail:'Customer-এর ভাষায় একটি প্রশ্ন ও যাচাই করা উত্তর লিখুন। Topic ও বিকল্প keywords দিন।'},
       {step:'02',title:'Publish training',detail:'Save & Publish চাপলে AI-এর Knowledge Base-এ তথ্য সঙ্গে সঙ্গে যুক্ত হবে। FAQ পরিবর্তন হবে না।'},
       {step:'03',title:'Test & improve',detail:'নতুনভাবে প্রশ্ন লিখে Bot-এর উত্তর পরীক্ষা করুন; দরকার হলে Q&A Edit করুন।'},
     ].map(item=><div key={item.step} className="rounded-xl border border-slate-200 bg-white p-4">
       <span className="inline-flex size-8 items-center justify-center rounded-lg bg-pink-50 text-xs font-bold text-pink-700">{item.step}</span>
       <h2 className="mt-2 text-sm font-bold text-slate-900">{item.title}</h2>
       <p className="mt-1 text-xs leading-6 text-slate-600">{item.detail}</p>
     </div>)}
   </section>
   <SupportKnowledgeManager/>
   <SupportTrainingPlayground/>
   <footer className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
      <p className="flex items-center gap-2 text-xs leading-6 text-blue-950"><ShieldCheck className="size-4 shrink-0"/> Bot শুধুমাত্র Niqaha-এর বিষয়ে উত্তর দেয়। এই পেজের Training Data আলাদা সংরক্ষিত; সাধারণ FAQ আগের মতোই থাকবে।</p>
   </footer>
 </main>;
}
