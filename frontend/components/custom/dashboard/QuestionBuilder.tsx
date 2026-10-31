'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown,ArrowUp,Check,ChevronRight,Eye,EyeOff,Filter,GripVertical,Plus,RefreshCcw,Save,Search,Settings2,Trash2,Users } from 'lucide-react';
import { toast } from 'sonner';
import { defaultQuestions,questionDisplayValue,questionUsesSeparateStorage,type ProfileQuestion,type ProfileQuestionSchema,type QuestionType } from '@/lib/profile-questions';
import { profileQuestionOptions } from '@/lib/profile-question-options';
import { QuestionInput } from '../updateProfile/DynamicQuestionStep';

const types:{value:QuestionType;label:string}[]=[
 {value:'text',label:'Short text'}, {value:'textarea',label:'Long text'},
 {value:'number',label:'Number'}, {value:'select',label:'Select / dropdown'},
 {value:'dropdown',label:'Dropdown'}, {value:'checkbox',label:'Single checkbox'},
 {value:'multi_checkbox',label:'Multiple checkboxes'},
];
function formatOptions(q:ProfileQuestion){
 return (q.options||[]).map(o=>o.label===o.value?o.value:o.label+' | '+o.value).join('\n');
}
function parseOptions(input:string){
 return input.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
  const [label,...parts]=line.split('|');
  return {label:label.trim(),value:(parts.length?parts.join('|'):label).trim()};
 }).filter(o=>o.value&&o.label);
}
const optionTypes=new Set<QuestionType>(['select','dropdown','multi_checkbox']);

export default function QuestionBuilder(){
 const [schema,setSchema]=useState<ProfileQuestionSchema>(defaultQuestions);
 const [selectedId,setSelectedId]=useState(defaultQuestions.questions[0]?.id||'');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState('');
 const [query,setQuery]=useState('');
 const [section,setSection]=useState('all');
 const [gender,setGender]=useState('all');
 const [answerPreview,setAnswerPreview]=useState<string|number|boolean|string[]>('');
 const [optionInput,setOptionInput]=useState('');
 const selected=schema.questions.find(q=>q.id===selectedId)||null;

 async function reload(){
  setLoading(true);setNotice('');
  try{
   const r=await fetch('/api/profile-questions?admin=1',{cache:'no-store'});
   if(!r.ok)throw Error('Administrator permission or backend connection required');
   const data=await r.json() as ProfileQuestionSchema;
   if(!Array.isArray(data.questions))throw Error('Invalid form schema');
   setSchema(data);
   setSelectedId(old=>data.questions.some(q=>q.id===old)?old:data.questions[0]?.id||'');
  }catch(e){setNotice(e instanceof Error?e.message:'Could not load questions');}
  finally{setLoading(false);}
 }
 useEffect(()=>{void reload();},[]);
 useEffect(()=>{setOptionInput(selected?formatOptions(selected):'');setAnswerPreview('');},[selectedId]);
 const filtered=useMemo(()=>schema.questions.filter(q=>
  (section==='all'||q.section===Number(section))&&
  (gender==='all'||q.gender==='both'||q.gender===gender)&&
  (q.question.toLowerCase().includes(query.toLowerCase())||
    q.publicLabel.toLowerCase().includes(query.toLowerCase())||
    q.path?.toLowerCase().includes(query.toLowerCase()))
 ).sort((a,b)=>a.section-b.section||a.order-b.order),[schema,section,gender,query]);
 const update=(changes:Partial<ProfileQuestion>)=>{
  if(!selected)return;
  setSchema(old=>({...old,questions:old.questions.map(q=>q.id===selected.id?{...q,...changes}:q)}));
 };
 const add=()=>{
  const id='q_'+crypto.randomUUID().replace(/-/g,'');
  const target=section==='all'?0:Number(section);
  const q:ProfileQuestion={
   id,question:'নতুন প্রশ্ন',publicLabel:'নতুন তথ্য',section:target,
   gender:gender==='male'||gender==='female'?gender:'both',
   type:'text',options:[],optionSource:'',required:false,enabled:true,
   showPublic:false,order:100+Math.max(0,...schema.questions.filter(q=>q.section===target).map(q=>q.order)),
   locked:false,
  };
  setSchema(s=>({...s,questions:[...s.questions,q]}));
  setSelectedId(id);setNotice('New question added locally. Save changes to publish it.');
 };
 const clone=()=>{
  if(!selected)return;
  const q={...selected,id:'q_'+crypto.randomUUID().replace(/-/g,''),
   path:undefined,legacyKey:undefined,locked:false,
   question:selected.question+' (copy)',order:selected.order+10,required:false,
   showPublic:false,options:selected.options.map(o=>({...o}))};
  setSchema(s=>({...s,questions:[...s.questions,q]}));
  setSelectedId(q.id);
 };
 const rearrange=(dir:number)=>{
  if(!selected)return;
  const siblings=schema.questions.filter(q=>q.section===selected.section).sort((a,b)=>a.order-b.order);
  const idx=siblings.findIndex(q=>q.id===selected.id),swap=siblings[idx+dir];
  if(!swap)return;
  const orderA=selected.order,orderB=swap.order;
  setSchema(s=>({...s,questions:s.questions.map(q=>q.id===selected.id?{...q,order:orderB}:
     q.id===swap.id?{...q,order:orderA}:q)}));
 };
 const save=async()=>{
  setSaving(true);setNotice('');
  try{
   const response=await fetch('/api/profile-questions',{
    method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(schema),
   });
   const json=await response.json();
   if(!response.ok)throw Error(Array.isArray(json.message)?json.message.join(', '):json.message||'Save failed');
   setSchema(json);
   toast.success('All questions saved to the database');
   setNotice('Saved in MongoDB. Forms and public labels now use this question configuration.');
  }catch(e){
   setNotice(e instanceof Error?e.message:'Save failed');
   toast.error('Changes could not be saved');
  }finally{setSaving(false);}
 };
 const previewGender=gender==='male'||gender==='female'?gender:'male';
 const total=schema.questions.length;
 return <div className="min-h-screen bg-[#fbf8f8] px-4 py-7 text-[#292329] md:px-7 md:py-9">
   <div className="mx-auto max-w-7xl space-y-6">
     <header className="rounded-3xl bg-[#2d202b] p-7 text-white md:p-9">
       <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-200"><Settings2 size={17}/> Niqaha · Dynamic profile studio</div>
       <div className="flex flex-wrap items-center justify-between gap-5">
         <div><h1 className="font-serif text-4xl font-semibold tracking-tight">Profile question builder</h1>
           <p className="mt-3 max-w-2xl text-sm leading-7 text-[#eadce5]">
             Manage the exact questions members answer, their gender and section, and the completely separate label visitors see on public biodata.</p>
         </div>
         <div className="flex gap-2">
           <button onClick={()=>void reload()} disabled={loading||saving} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold hover:bg-white/10"><RefreshCcw size={16}/> Refresh</button>
           <button onClick={()=>void save()} disabled={loading||saving} className="inline-flex items-center gap-2 rounded-xl bg-[#ee7792] px-5 py-3 text-sm font-bold text-[#261a23] hover:bg-[#f7a6bb] disabled:opacity-50"><Save size={17}/> {saving?'Saving...':'Save all changes'}</button>
         </div>
       </div>
       <div className="mt-6 flex flex-wrap gap-3">
         <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{total} questions</span>
         <span className="rounded-full bg-white/10 px-3 py-1 text-xs">10 form sections</span>
         <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Revision {schema.revision}</span>
         <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Original answers preserved</span>
       </div>
     </header>
     {notice&&<p role="status" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#9b3955]">{notice}</p>}
     <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,350px)_minmax(0,1fr)]">
       <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
         <div className="space-y-3 border-b border-rose-100 p-4">
           <div className="flex items-center justify-between"><h2 className="font-bold">All questions</h2><button onClick={add} className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"><Plus size={14}/> Add new</button></div>
           <div className="relative"><Search size={16} className="absolute left-3 top-3 text-rose-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a question or field..." className="w-full rounded-lg border px-3 py-2.5 pl-9 text-sm"/></div>
           <div className="grid grid-cols-2 gap-2">
             <select value={section} onChange={e=>setSection(e.target.value)} aria-label="Filter section" className="w-full rounded-lg border px-2 py-2 text-xs">
               <option value="all">All sections</option>{schema.sections.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
             </select>
             <select value={gender} onChange={e=>setGender(e.target.value)} aria-label="Filter gender" className="w-full rounded-lg border px-2 py-2 text-xs">
               <option value="all">All genders</option><option value="male">Men</option><option value="female">Women</option>
             </select>
           </div>
         </div>
         <div className="max-h-[720px] space-y-1 overflow-y-auto p-2">
           {filtered.map(q=><button key={q.id} data-question-id={q.id} onClick={()=>setSelectedId(q.id)} className={'w-full rounded-xl border px-3 py-3 text-left transition-colors '+(q.id===selectedId?'border-rose-300 bg-rose-50':'border-transparent hover:bg-[#faf5f7]')}>
             <div className="flex gap-2"><GripVertical size={15} className="mt-0.5 shrink-0 text-rose-300"/>
               <div className="min-w-0 flex-1">
                 <p className={'text-sm font-semibold leading-6 '+(!q.enabled?'line-through opacity-50':'')}>{q.question}</p>
                 <p className="mt-1 truncate text-[11px] text-[#8e7f85]">{schema.sections[q.section]?.title} · {q.gender==='both'?'Both':q.gender} · {q.type}</p>
               </div>
               <ChevronRight size={15} className="shrink-0 text-rose-400"/>
             </div>
           </button>)}
           {!filtered.length&&<p className="p-4 text-center text-sm text-muted-foreground">No matching questions.</p>}
         </div>
       </section>
       {selected?<div className="space-y-5">
         <section className="space-y-5 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm md:p-7">
           <div className="flex flex-wrap items-start justify-between gap-3">
             <div><p className="text-xs font-bold uppercase tracking-widest text-rose-600">Question settings</p>
               <h2 className="mt-1 font-serif text-2xl font-bold">Edit question</h2>
               <p className="mt-1 font-mono text-[10px] text-[#98858d]">{selected.path||selected.legacyKey||selected.id}</p>
             </div>
             <div className="flex flex-wrap gap-2">
               <button aria-label="Move question up" onClick={()=>rearrange(-1)} className="rounded-lg border p-2 hover:bg-rose-50"><ArrowUp size={16}/></button>
               <button aria-label="Move question down" onClick={()=>rearrange(1)} className="rounded-lg border p-2 hover:bg-rose-50"><ArrowDown size={16}/></button>
               <button onClick={clone} className="rounded-lg border px-3 py-2 text-xs font-semibold">Duplicate</button>
               <button disabled={selected.locked} onClick={()=>update({enabled:!selected.enabled})}
                 className={'flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold '+(selected.enabled?'text-rose-700':'text-green-700')}>
                 {selected.enabled?<><Trash2 size={13}/> Remove</>:<><Check size={13}/> Restore</>}
               </button>
             </div>
           </div>
           <div className="grid gap-4">
             <label className="space-y-2"><span className="text-xs font-bold">Question asked to the member</span>
               <textarea dir="auto" rows={3} maxLength={1000} value={selected.question} onChange={e=>update({question:e.target.value})} className="w-full rounded-xl border border-rose-100 p-3 text-sm focus:outline-rose-400"/></label>
             <div className="grid gap-4 sm:grid-cols-3">
               <label className="space-y-2"><span className="text-xs font-bold">Input type</span>
                 <select value={selected.type} onChange={e=>update({type:e.target.value as QuestionType})} className="w-full rounded-lg border px-3 py-3 text-sm">
                   {types.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                 </select></label>
               <label className="space-y-2"><span className="text-xs font-bold">Member gender</span>
                 <select disabled={selected.locked} value={selected.gender} onChange={e=>update({gender:e.target.value as any})} className="w-full rounded-lg border px-3 py-3 text-sm">
                   <option value="both">Both men & women</option><option value="male">Men only</option><option value="female">Women only</option>
                 </select></label>
               <label className="space-y-2"><span className="text-xs font-bold">Form section</span>
                 <select value={selected.section} onChange={e=>{const next=Number(e.target.value); update({section:next,order:Math.max(0,...schema.questions.filter(q=>q.section===next).map(q=>q.order))+100});}} className="w-full rounded-lg border px-3 py-3 text-sm">
                   {schema.sections.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
                 </select></label>
             </div>
             <p className="text-xs text-[#8d7983]">All profile questions, including previous defaults and pledges, can be made optional, moved, or removed. Authentication credentials are managed separately.</p>
             <div className="grid gap-4 sm:grid-cols-3">
               <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-rose-100 px-3 py-4 text-xs font-bold"><input type="checkbox" checked={selected.enabled} disabled={selected.locked} onChange={e=>update({enabled:e.target.checked})}/> Show in form</label>
               <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-rose-100 px-3 py-4 text-xs font-bold"><input type="checkbox" checked={selected.required} disabled={selected.locked} onChange={e=>update({required:e.target.checked})}/> Required answer</label>
               <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-rose-100 px-3 py-4 text-xs font-bold"><input type="checkbox" checked={selected.showPublic} disabled={!!selected.path&&['email','phoneNumber','password'].includes(selected.path)} onChange={e=>update({showPublic:e.target.checked})}/> Show on public biodata</label>
             </div>
             <label className="space-y-2"><span className="flex items-center gap-2 text-xs font-bold"><Eye size={15}/> Public biodata label (separate from question)</span>
               <input dir="auto" value={selected.publicLabel} maxLength={2000} onChange={e=>update({publicLabel:e.target.value})}
                 placeholder="Example: Age" className="w-full rounded-lg border border-rose-100 px-3 py-3 text-sm"/>
               <span className="block text-xs text-[#8d7983]">Example: ask “How old are you?” but show “Age:” next to the answer.</span>
             </label>
             {optionTypes.has(selected.type)&&<div className="space-y-2">
               <div className="flex flex-wrap items-center justify-between gap-3">
                 <span className="text-xs font-bold">Answer choices · one per line</span>
                 {!!selected.optionSource&&<button onClick={()=>{setOptionInput(profileQuestionOptions(selected,gender==='all'?'male':gender).map(o=>o.label+' | '+o.value).join('\n'));update({optionSource:'',options:profileQuestionOptions(selected,gender==='all'?'male':gender)});}}
                   className="text-xs font-semibold text-rose-700 underline">Customize default choices</button>}
               </div>
               {!!selected.optionSource&&!selected.options.length?<p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">Using the original dropdown choices. Click Customize to replace them.</p>:(
                 <textarea rows={5} value={optionInput} onChange={e=>{setOptionInput(e.target.value);update({options:parseOptions(e.target.value),optionSource:''});}}
                   placeholder={'Yes | yes\nNo | no'} className="w-full rounded-lg border px-3 py-3 font-mono text-sm"/>
               )}
               <p className="text-xs text-[#93838c]">Format: Display text | saved value. Existing answer values remain unchanged when you rename labels.</p>
             </div>}
             {selected.locked&&<p className="rounded-lg bg-amber-50 px-3 py-3 text-xs text-amber-900">Authentication settings are managed separately and cannot be edited here.</p>}
             {!selected.locked&&!!(selected.path||selected.legacyKey)&&questionUsesSeparateStorage(selected)&&<p className="rounded-lg bg-blue-50 px-3 py-3 text-xs text-blue-900">This new input type uses a separate answer slot. Older profile answers are preserved in their original fields; changing the type will not overwrite them.</p>}
           </div>
         </section>
         <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm md:p-7">
           <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Eye size={18} className="text-rose-600"/> Live preview</h2>
           <QuestionInput key={selected.id} q={selected} value={answerPreview} onChange={v=>setAnswerPreview(v)}
             gender={previewGender} profile={{gender:previewGender}} preview/>
           <div className="mt-4 rounded-xl bg-[#faf5f7] p-4">
             <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-600">Public biodata preview</p>
             {selected.showPublic?<p dir="auto" className="text-sm"><strong>{selected.publicLabel||'Label'}:</strong> {questionDisplayValue(answerPreview,selected)||'Sample answer'}</p>
               :<p className="flex items-center gap-2 text-xs text-[#8d7c86]"><EyeOff size={15}/> Not displayed publicly</p>}
           </div>
         </section>
       </div>:<section className="rounded-2xl border bg-white p-8">Choose a question to edit.</section>}
     </div>
   </div>
 </div>;
}
