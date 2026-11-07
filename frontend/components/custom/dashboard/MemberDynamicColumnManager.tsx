'use client';

import {useState} from 'react';
import {Columns3,Plus,Save,Eye,EyeOff,Pencil,Loader2,Flame} from 'lucide-react';
import {toast} from 'sonner';
import {PostRequestAxios,PatchRequestAxios} from '@/api-hooks/api-hooks';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';

export type MemberAdminColumn={
 id:string;label:string;type:'text'|'choice'|'flag';options:string[];enabled:boolean;builtIn:boolean;
};
export type MemberAdminColumnsResponse={
 columns:MemberAdminColumn[];
 values:Record<string,Record<string,string|boolean|null>>;
 profileColumns:{id:string;label:string;questionIds:string[]}[];
 profileValues:Record<string,Record<string,string>>;
 availableFields:{id:string;label:string;section:string;type:string}[];
};
const field='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:outline-2 focus:outline-pink-500';
const blank=()=>({label:'',type:'text' as MemberAdminColumn['type'],options:'',enabled:true});
export function memberColumnText(value:string|boolean|null|undefined,column:MemberAdminColumn):string{
 if(value===null||value===undefined||value==='')return '';
 if(column.type==='flag')return value===true?'Yes':'No';
 return String(value);
}
export function memberColumnClasses(column:MemberAdminColumn,value:string|boolean|null|undefined){
 if(column.id==='hot-data'){
   if(value==='Hot')return 'border-red-200 bg-red-50 text-red-800';
   if(value==='Follow-up')return 'border-amber-200 bg-amber-50 text-amber-900';
   if(value==='Normal')return 'border-slate-200 bg-slate-50 text-slate-600';
 }
 if(column.type==='flag' && value===true)return 'border-emerald-200 bg-emerald-50 text-emerald-800';
 return 'border-slate-200 bg-white text-slate-700';
}
export function MemberValueButton({column,value,onClick}:{
 column:MemberAdminColumn;value:string|boolean|null|undefined;onClick:()=>void;
}){
 const display=memberColumnText(value,column);
 return <button type="button" onClick={onClick} title={'Edit '+column.label}
   className={cn('inline-flex min-h-8 max-w-[220px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:border-pink-300 hover:shadow-sm',
     memberColumnClasses(column,value))}>
   {column.id==='hot-data'&&<Flame className="size-3.5 shrink-0"/>}
   <span className="min-w-0 truncate">{display||'Add value'}</span>
   <Pencil className="size-3 shrink-0 opacity-50"/>
 </button>;
}

export default function MemberDynamicColumnManager({columns,onSaved}:{
 columns:MemberAdminColumn[];onSaved:()=>void;
}){
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<MemberAdminColumn|null>(null);
 const [form,setForm]=useState(blank),[pending,setPending]=useState(false);
 const custom=columns.filter(c=>!c.builtIn);
 const edit=(column:MemberAdminColumn)=>{
   setEditing(column);setForm({label:column.label,type:column.type,options:column.options.join(', '),enabled:column.enabled});
 };
 const reset=()=>{setEditing(null);setForm(blank())};
 const save=async()=>{
   if(form.label.trim().length<2){toast.error('Column name must have at least 2 characters');return;}
   const options=form.type==='choice'?form.options.split(',').map(v=>v.trim()).filter(Boolean):[];
   if(form.type==='choice'&&(options.length<2||options.length>12)){
     toast.error('Add 2–12 dropdown values separated by commas');return;
   }
   setPending(true);
   try{
     const payload={...form,options};
     const [result,error]=editing
       ?await PatchRequestAxios('/admin/member-columns/'+editing.id,payload)
       :await PostRequestAxios('/admin/member-columns',payload);
     if(error||!result)throw new Error(error?.message||'Could not save column');
     toast.success(editing?'Column updated':'New member column added');reset();onSaved();
   }catch(error){toast.error(error instanceof Error?error.message:'Could not save column');}
   finally{setPending(false);}
 };
 return <>
   <button type="button" onClick={()=>setOpen(true)}
     className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50">
     <Columns3 className="size-4"/> অভ্যন্তরীণ নোট কলাম
   </button>
   <Dialog open={open} onOpenChange={next=>{setOpen(next);if(!next)reset()}}>
     <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
       <DialogHeader>
         <DialogTitle className="flex items-center gap-2"><Columns3 className="size-5 text-pink-600"/> Member table custom columns</DialogTitle>
         <DialogDescription>Admin-only internal information. Create a column, then edit its value separately for each member. It never changes the public Biodata.</DialogDescription>
       </DialogHeader>
       <div className="space-y-3">
         <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
           <p className="text-[13px] font-semibold text-slate-800">নিজস্ব নোট ও ম্যানুয়াল স্ট্যাটাস</p>
           <p className="mt-1 text-xs leading-5 text-slate-600">
             এটি শুধু Internal Notes/Follow-up-এর জন্য। বায়োডাটার আসল বৈবাহিক অবস্থা,
             পেশা ও অন্যান্য উত্তর টেবিলে দেখতে “বায়োডাটা কলাম বাছুন” ব্যবহার করুন।
           </p>
         </div>
         {!!custom.length&&<div className="space-y-2">
           <h3 className="text-sm font-bold text-slate-800">Your dynamic columns ({custom.length}/12)</h3>
           {custom.map(col=><div key={col.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
             <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{col.label}</p>
              <p className="text-[11px] text-slate-500">{col.type} · {col.enabled?'Visible':'Hidden'}{col.type==='choice'?' · '+col.options.join(', '):''}</p>
             </div>
             <button type="button" onClick={()=>edit(col)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-pink-700 hover:bg-pink-50"><Pencil size={13}/> Edit</button>
           </div>)}
         </div>}
         <div className="space-y-3 border-t border-slate-100 pt-4">
           <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">{editing?<Pencil className="size-4"/>:<Plus className="size-4"/>}{editing?'Edit column':'Add custom column'}</h3>
           <div className="grid gap-3 sm:grid-cols-2">
             <label className="text-xs font-semibold">Column heading
               <input maxLength={40} value={form.label} onChange={e=>setForm(s=>({...s,label:e.target.value}))}
                 placeholder="e.g. Priority, Notes, Follow-up Date" className={field}/></label>
             <label className="text-xs font-semibold">Column field type
               <select value={form.type} disabled={!!editing} className={field}
                 onChange={e=>setForm(s=>({...s,type:e.target.value as MemberAdminColumn['type']}))}>
                  <option value="text">Text / Notes</option><option value="choice">Dropdown</option><option value="flag">Yes / No</option>
               </select></label>
           </div>
           {form.type==='choice'&&<label className="block text-xs font-semibold">Dropdown values (comma separated)
             <input value={form.options} maxLength={490} onChange={e=>setForm(s=>({...s,options:e.target.value}))}
               placeholder="High, Medium, Low" className={field}/></label>}
           {editing&&<label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
             <input type="checkbox" className="size-4 accent-pink-600" checked={form.enabled}
               onChange={e=>setForm(s=>({...s,enabled:e.target.checked}))}/>
             {form.enabled?<><Eye size={14}/> Visible in member table</>:<><EyeOff size={14}/> Hidden (saved values preserved)</>}
           </label>}
           <div className="flex flex-wrap items-center gap-2">
             <button type="button" disabled={pending||(!editing&&custom.length>=12)} onClick={()=>void save()}
               className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pink-600 px-4 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-40">
               {pending?<Loader2 className="size-4 animate-spin"/>:<Save className="size-4"/>}
               {editing?'Update column':'Create column'}
             </button>
             {editing&&<button type="button" onClick={reset} className="rounded-lg border px-3 py-2 text-xs font-semibold">Cancel edit</button>}
           </div>
         </div>
       </div>
     </DialogContent>
   </Dialog>
 </>;
}
