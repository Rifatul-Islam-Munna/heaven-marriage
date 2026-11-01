'use client';
import {useCallback,useEffect,useState} from 'react';
import {Loader2,Plus,Pencil,Trash2,X,Check} from 'lucide-react';
import {DashButton,Panel,fieldClass} from '@/components/custom/dashboard/dashboard-kit';
import {blogErrorMessage} from '@/lib/blog-error';
export type ManagedCategory={id:string;name:string;count:number;drafts:number;protected:boolean};
export function useBlogCategories(){
  const [categories,setCategories]=useState<ManagedCategory[]>([]);
  const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch('/api/blog/admin/categories',{cache:'no-store'});
      const data:unknown=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(blogErrorMessage(data,'Cannot load categories'));
      setCategories(Array.isArray(data)?data:[]);
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh().catch(()=>setLoading(false));},[refresh]);
  return {categories,loading,refresh};
}
export default function BlogCategoryManager({categories,refresh}:{categories:ManagedCategory[];refresh:()=>Promise<void>}){
  const [name,setName]=useState('');
  const [editing,setEditing]=useState<string|null>(null);
  const [rename,setRename]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  async function request(method:'POST'|'PATCH'|'DELETE',path:string,body?:{name:string}){
    setBusy(true);setError('');setMessage('');
    try{const response=await fetch('/api/blog/admin/categories'+path,{method,
      headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
      const data:unknown=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(blogErrorMessage(data,'Unable to save category'));
      await refresh();setEditing(null);setName('');setMessage('Category changes saved.');
    }catch(e){setError(e instanceof Error?e.message:'Category update failed');}
    finally{setBusy(false);}
  }
  return <Panel title="Blog categories" description="Create, rename or remove categories. Changes also update published articles and their public filters.">
    <div className="space-y-3">
      <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();if(name.trim())void request('POST','',{name:name.trim()});}}>
        <input aria-label="New blog category" className={fieldClass+' min-w-0 flex-1'} placeholder="New category name" value={name} maxLength={90} onChange={e=>setName(e.target.value)}/>
        <DashButton type="submit" tone="primary" disabled={busy||name.trim().length<2}><Plus size={15}/> Add category</DashButton>
      </form>
      {error&&<p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
      <ul className="divide-y divide-[#f0f0f0] rounded-md border border-[#e9ecef]">
        {categories.map(category=><li key={category.id} className="flex flex-wrap items-center gap-2 p-3 text-[13px]">
          {editing===category.id?<form className="flex min-w-0 flex-1 gap-2" onSubmit={e=>{e.preventDefault();void request('PATCH','/'+category.id,{name:rename});}}>
            <input aria-label="Rename category" autoFocus className={fieldClass+' min-w-0 flex-1'} value={rename} maxLength={90} onChange={e=>setRename(e.target.value)}/>
            <DashButton type="submit" disabled={busy||rename.trim().length<2}><Check size={14}/> Save</DashButton>
            <DashButton disabled={busy} onClick={()=>setEditing(null)}><X size={14}/> Cancel</DashButton>
          </form>:<>
            <span className="min-w-0 flex-1 font-medium text-[#212529]">{category.name}</span>
            <span className="text-[#6c757d]">{category.count} live · {category.drafts} drafts</span>
            {!category.protected&&<>
              <DashButton disabled={busy} onClick={()=>{setEditing(category.id);setRename(category.name);}}><Pencil size={13}/> Edit</DashButton>
              <DashButton tone="danger" disabled={busy} onClick={()=>{
                if(window.confirm('Delete '+category.name+'? Existing articles will move to Guides.'))void request('DELETE','/'+category.id);
              }}><Trash2 size={13}/> Remove</DashButton>
            </>}
          </>}
        </li>)}
      </ul>
      {busy&&<p className="flex items-center gap-2 text-xs text-[#6c757d]"><Loader2 size={13} className="animate-spin"/> Saving categories…</p>}
    </div>
  </Panel>;
}
