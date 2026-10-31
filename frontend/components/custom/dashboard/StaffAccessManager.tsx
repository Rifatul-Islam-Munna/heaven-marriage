'use client';
import {useCallback,useEffect,useState} from 'react';
import {Check,CheckCircle2,ChevronRight,KeyRound,LockKeyhole,
  Search,Shield,ShieldCheck,Users,Save,Loader2,BookOpen,Globe2} from 'lucide-react';
import {STAFF_SECTIONS,type DashboardSection,type StaffRole} from '@/lib/dashboard-access';

type AssignedRole='user'|'seo'|'blog'|'manager';
type StaffAccount={
  id:string;name:string;email:string;phoneNumber:string;userId:string;
  role:StaffRole;permissions:DashboardSection[];
};
const roles:{value:AssignedRole;label:string;description:string}[]=[
  {value:'user',label:'Normal user',description:'No dashboard access'},
  {value:'seo',label:'SEO editor',description:'Only the SEO manager page'},
  {value:'blog',label:'Blog editor',description:'Only blog management and image uploads for articles'},
  {value:'manager',label:'Manager',description:'Only the dashboard pages you check below'},
];
const input='w-full rounded-xl border border-[#e9dbe2] bg-white px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

export default function StaffAccessManager(){
  const [staff,setStaff]=useState<StaffAccount[]>([]);
  const [search,setSearch]=useState('');
  const [results,setResults]=useState<StaffAccount[]|null>(null);
  const [selected,setSelected]=useState<StaffAccount|null>(null);
  const [role,setRole]=useState<AssignedRole>('user');
  const [permissions,setPermissions]=useState<DashboardSection[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [querying,setQuerying]=useState(false);

  const refresh=useCallback(async()=>{
    try{
      const response=await fetch('/api/staff-access/admin/staff',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data.message||'Cannot load staff accounts');
      setStaff(data);
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'Cannot load staff accounts');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);

  const choose=(user:StaffAccount)=>{
    setSelected(user);
    setRole(['seo','blog','manager'].includes(user.role)?user.role as AssignedRole:'user');
    setPermissions(user.role==='manager'?[...user.permissions]:[]);
    setError('');setMessage('');
  };
  async function findUsers(){
    setMessage('');setError('');
    if(search.trim().length<2){setError('Enter at least 2 characters of a name, email, phone or member ID');return;}
    setQuerying(true);
    try{
      const r=await fetch('/api/staff-access/admin/search?q='+encodeURIComponent(search.trim()),{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw Error(data.message||'Search failed');
      setResults(data);
    }catch(e){setError(e instanceof Error?e.message:'Search failed');}
    finally{setQuerying(false);}
  }
  const toggle=(key:DashboardSection,checked:boolean)=>
    setPermissions(prev=>checked?[...new Set([...prev,key])]:prev.filter(x=>x!==key));
  async function assign(){
    if(!selected||selected.role==='admin'||busy)return;
    setBusy(true);setError('');setMessage('');
    try{
      const resp=await fetch('/api/staff-access/admin/'+selected.id,{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({role,permissions:role==='manager'?permissions:[]}),
      });
      const data=await resp.json();
      if(!resp.ok)throw Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Assignment failed');
      setSelected(data);
      setRole(['seo','blog','manager'].includes(data.role)?data.role:'user');
      setPermissions(data.role==='manager'?data.permissions:[]);
      setStaff(current=>[data,...current.filter(row=>row.id!==data.id)].filter(row=>row.role!=='user'));
      setResults(current=>current?.map(row=>row.id===data.id?data:row)||null);
      setMessage('Role and page access saved in MongoDB. Changes apply to the next request, including existing sessions.');
    }catch(e){setError(e instanceof Error?e.message:'Assignment failed');}
    finally{setBusy(false);}
  }
  const noChange=!selected||(
    role===selected.role&&JSON.stringify([...permissions].sort())===
      JSON.stringify([...(selected.role==='manager'?selected.permissions:[])].sort())
  );
  const entries=results??staff;
  return <main className="min-h-screen bg-[#fcf8f9] px-4 py-7 text-[#30222b] md:px-8">
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="relative overflow-hidden rounded-[28px] bg-[#2e1d29] px-7 py-9 text-white md:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-rose-400/20 blur-3xl"/>
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-rose-200"><ShieldCheck size={16}/> Niqaha · Access control</p>
            <h1 className="font-serif text-4xl font-semibold md:text-5xl">The right access.<br/><span className="text-[#ffc4d4]">Only where needed.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
              Choose an existing member account, assign SEO or Blog access, or make them a manager and select exactly which pages they can work with.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-2">{staff.length} staff accounts</span>
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2"><LockKeyhole size={14}/> Admin-only settings</span>
          </div>
        </div>
      </header>

      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,380px)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#eee0e6] bg-white shadow-sm">
          <div className="space-y-3 border-b border-rose-100 p-5">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold"><Users size={19} className="text-rose-600"/> Find a person</h2>
            <p className="text-xs leading-5 text-[#927e87]">Search existing members by name, phone, email or user ID.</p>
            <form onSubmit={e=>{e.preventDefault();void findUsers();}} className="flex gap-2">
              <input aria-label="Search member accounts" className={input+' min-w-0 flex-1'} value={search}
                onChange={e=>setSearch(e.target.value)} placeholder="Search account..."/>
              <button type="submit" disabled={querying} className="rounded-xl bg-[#392633] px-4 text-white disabled:opacity-40" aria-label="Search accounts">
                {querying?<Loader2 size={17} className="animate-spin"/>:<Search size={17}/>}</button>
            </form>
            {results&&<button onClick={()=>{setResults(null);setSearch('');}} className="text-xs font-bold text-rose-700 underline">Back to existing staff</button>}
          </div>
          <div className="max-h-[620px] divide-y divide-[#f2e8ec] overflow-y-auto">
            {loading?<p className="p-6 text-sm text-[#917a84]">Loading staff accounts...</p>:
              entries.length===0?<p className="p-8 text-center text-sm text-[#917a84]">No accounts found.</p>:
              entries.map(user=><button key={user.id} onClick={()=>choose(user)} type="button"
                className={'flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-rose-50/70 '+(selected?.id===user.id?'bg-rose-50':'')}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f9e3eb] text-sm font-bold text-rose-700">
                  {(user.name||'U').slice(0,2).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{user.name||'Unnamed account'}</span>
                  <span className="mt-1 block truncate text-xs text-[#927d88]">{user.phoneNumber||user.email||user.userId||'Account'}</span>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700">{user.role}</span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-[#ba9da8]"/>
              </button>)}
          </div>
        </section>
        <section className="rounded-2xl border border-[#eee0e6] bg-white p-5 shadow-sm md:p-7">
          {!selected?<div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <Shield className="mb-4 text-rose-200" size={53}/>
            <h2 className="font-serif text-2xl font-bold">Select an account</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[#92808a]">Pick a current staff member or search for any registered user. Only administrators can change access.</p>
          </div>:<>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-rose-700">Selected account</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold">{selected.name||'Unnamed member'}</h2>
                <p className="mt-2 break-all text-sm text-[#897481]">{selected.email||selected.phoneNumber||selected.userId}</p>
              </div>
              <span className="rounded-full bg-rose-50 px-4 py-2 text-xs font-bold uppercase text-rose-800">{selected.role}</span>
            </div>
            {selected.role==='admin'?<p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Administrator access is protected and cannot be changed from this panel.</p>:<>
              <div className="mt-7 border-t border-rose-100 pt-6">
                <h3 className="text-sm font-bold">Choose role</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {roles.map(item=><label key={item.value}
                    className={'flex cursor-pointer gap-3 rounded-xl border p-4 transition '+(role===item.value?'border-rose-400 bg-rose-50':'border-[#eee2e7] hover:border-rose-200')}>
                    <input type="radio" name="staff-role" value={item.value} checked={role===item.value}
                      onChange={()=>{setRole(item.value);setPermissions(item.value==='manager'?
                        (selected.role==='manager'?selected.permissions:[]):[]);}}
                      className="mt-0.5 size-4 shrink-0 accent-rose-600"/>
                    <span><span className="block text-sm font-bold">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#8d7883]">{item.description}</span></span>
                  </label>)}
                </div>
              </div>
              {role==='manager'&&<div className="mt-7 border-t border-rose-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold">Manager page permissions</h3>
                    <p className="mt-1 text-xs text-[#927d87]">Only checked pages will appear and allow API access.</p></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setPermissions(STAFF_SECTIONS.map(x=>x.key))}
                      className="text-xs font-bold text-rose-700 underline">Select all</button>
                    <button type="button" onClick={()=>setPermissions([])}
                      className="text-xs font-bold text-[#857480] underline">Clear</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {STAFF_SECTIONS.map(section=><label key={section.key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#f0e6ea] px-4 py-3 hover:bg-rose-50">
                    <input type="checkbox" checked={permissions.includes(section.key)}
                      onChange={e=>toggle(section.key,e.target.checked)}
                      className="size-4 shrink-0 accent-rose-600"/>
                    <span className="text-sm font-semibold">{section.label}</span>
                  </label>)}
                </div>
                {!permissions.length&&<p className="mt-3 text-xs text-amber-700">With no pages checked, the manager cannot enter the admin dashboard.</p>}
              </div>}
              {(role==='seo'||role==='blog')&&<p className="mt-6 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
                {role==='seo'?<Globe2 className="mt-0.5 shrink-0" size={18}/>:<BookOpen className="mt-0.5 shrink-0" size={18}/>}
                {role==='seo'?'SEO staff can edit SEO only, not the Blog Studio or other dashboard pages.':
                  'Blog staff can edit articles and upload blog images, but cannot open other dashboard sections.'}
              </p>}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-rose-100 pt-6">
                <p className="max-w-md text-xs leading-6 text-[#98818c]">Permissions are checked by the backend on every request. Changing or removing permissions takes effect immediately.</p>
                <button type="button" disabled={busy||noChange}
                  onClick={()=>void assign()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8b3755] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#722b43] disabled:opacity-40">
                  {busy?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} Save access
                </button>
              </div>
            </>}
          </>}
        </section>
      </div>
    </div>
  </main>;
}
