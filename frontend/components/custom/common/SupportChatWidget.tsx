'use client';
import {usePathname} from 'next/navigation';
import {useRef,useState,useEffect,type CSSProperties} from 'react';
import {Bot,Send,X,ShieldCheck,Loader2,Phone,Ellipsis} from 'lucide-react';
import {FaFacebookMessenger} from 'react-icons/fa';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import {contacts} from '@/lib/contact-config';
import {normalizeMessengerUrl} from '@/lib/messenger-url';
import SupportSmileAvatar from './SupportSmileAvatar';
import styles from './SupportChatWidget.module.css';
import {cn} from '@/lib/utils';

type Source={title:string;url:string};
type Entry={id:string;role:'user'|'assistant';text:string;sources?:Source[]};
type Reply={answer?:string;message?:string;sources?:Source[];remaining?:number;limit?:number};
const suggestions=['কখন অফিসে ফোন করতে পারব?','Premium সেবায় কী কী সুবিধা আছে?','বায়োডাটা কীভাবে Submit করব?','Connection-এর জন্য কত টাকা লাগে?'];
const allowed=['/faq','/guidelines','/contact','/signup','/biodata','/about','/premium','/pricing'];
export default function SupportChatWidget(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [contactsOpen,setContactsOpen]=useState(false);
 const {data:contactSettings}=useQueryWrapper<{messengerUrl?:string}>(
   ['public-settings'],'/public/settings',{staleTime:60000,refetchOnWindowFocus:true},
 );
 const messengerUrl=normalizeMessengerUrl(contactSettings?.messengerUrl??contacts.messenger);
 const showContactActions=!pathname?.startsWith('/profile');
 const biodataDetails=pathname?.startsWith('/biodata/');
 const [message,setMessage]=useState('');
 const [entries,setEntries]=useState<Entry[]>([]);
 const [remaining,setRemaining]=useState(10);
 const [busy,setBusy]=useState(false);
 const [blocked,setBlocked]=useState(false);
 const [keyboardOverlap,setKeyboardOverlap]=useState(0);
 const messagesPane=useRef<HTMLDivElement>(null);
 // Keep the chat itself scrolled; scrollIntoView on a fixed panel can move the page.
 useEffect(()=>{
   const pane=messagesPane.current;
   if(open&&pane)pane.scrollTo({top:pane.scrollHeight,behavior:'smooth'});
 },[entries,open]);
 useEffect(()=>{
   if(!open&&!contactsOpen)return;
   const escape=(event:KeyboardEvent)=>{
     if(event.key==='Escape'){setOpen(false);setContactsOpen(false);}
   };
   window.addEventListener('keydown',escape);
   return ()=>window.removeEventListener('keydown',escape);
 },[open,contactsOpen]);
 useEffect(()=>{setOpen(false);setContactsOpen(false);},[pathname]);
 // iOS/Android virtual keyboards may resize the visual viewport instead of the
 // layout viewport. Keep the message composer above the keyboard.
 useEffect(()=>{
   if(!open||!window.visualViewport)return;
   const viewport=window.visualViewport;
   const update=()=>{
     const occluded=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop);
     setKeyboardOverlap(occluded>120?Math.round(occluded):0);
   };
   update();
   viewport.addEventListener('resize',update);
   viewport.addEventListener('scroll',update);
   return ()=>{
     viewport.removeEventListener('resize',update);
     viewport.removeEventListener('scroll',update);
   };
 },[open]);
 useEffect(()=>{
   if(!open)return;
   const controller=new AbortController();
   void fetch('/api/support-chat',{cache:'no-store',credentials:'same-origin',signal:controller.signal})
    .then(response=>response.ok?response.json():null)
    .then((result:{remaining?:number}|null)=>{
      if(controller.signal.aborted||!result||typeof result.remaining!=='number')return;
      setRemaining(result.remaining);
      setBlocked(result.remaining<=0);
    }).catch(()=>{});
   return ()=>controller.abort();
 },[open]);
 if(pathname?.startsWith('/dashboard'))return null;
 const send=async(text:string)=>{
   const q=text.trim();
   if(!q||busy||blocked)return;
   setMessage('');setBusy(true);
   setEntries(rows=>[...rows,{id:crypto.randomUUID(),role:'user',text:q}]);
   try{
     const response=await fetch('/api/support-chat',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({message:q}),credentials:'same-origin',cache:'no-store',
     });
     const result=await response.json() as Reply;
     if(typeof result.remaining==='number')setRemaining(result.remaining);
     if(!response.ok){
       if(response.status===429){setBlocked(true);setRemaining(0);}
       throw Error(typeof result.message==='string'?result.message:'সহায়তা এখন উপলব্ধ নেই।');
     }
     setEntries(rows=>[...rows,{id:crypto.randomUUID(),role:'assistant',
       text:result.answer||'এই প্রশ্নের উত্তর পেতে অফিসে যোগাযোগ করুন।',
       sources:result.sources?.filter(s=>allowed.some(path=>s.url===path||s.url.startsWith(path+'/')))}]);
     if(result.remaining===0)setBlocked(true);
   }catch(error){
     setEntries(rows=>[...rows,{id:crypto.randomUUID(),role:'assistant',
       text:error instanceof Error?error.message:'সংযোগে সমস্যা হয়েছে। /contact পেজ থেকে যোগাযোগ করুন।',
       sources:[{title:'Contact team',url:'/contact'}]}]);
   }finally{setBusy(false);}
 };
 const dockStyle={
   '--chat-sheet-bottom': keyboardOverlap
      ? `${keyboardOverlap+12}px`
      : 'calc(78px + env(safe-area-inset-bottom))',
   '--support-dock-bottom':biodataDetails
    ? 'calc(132px + env(safe-area-inset-bottom))'
    : 'calc(88px + env(safe-area-inset-bottom))',
 } as CSSProperties;
 return <div data-support-hub="true" data-chat-open={open}
   style={dockStyle}
   className={cn('pointer-events-none fixed bottom-[var(--support-dock-bottom)] right-3 z-[65] flex flex-col items-end gap-3 sm:right-5 lg:bottom-6',
     open&&styles.chatOpen)}> 
   {open&&<section id="niqaha-support-dialog" role="dialog" aria-modal="false" aria-label="Niqaha customer support assistant"
     className={cn('pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-pink-200 bg-white shadow-[0_20px_70px_-28px_rgba(65,24,42,.6)]',styles.chatPanel)}> 
     <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-pink-700 to-rose-700 px-4 py-3 text-white">
       <div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-white/20"><Bot size={19}/></span>
         <div><p className="text-sm font-bold">Niqaha Support AI</p><p className="text-[11px] text-white/85">Website questions only · 24-hour limit</p></div>
       </div>
       <button type="button" onClick={()=>setOpen(false)} aria-label="Close support chat"
         className="flex size-9 items-center justify-center rounded-lg hover:bg-white/20"><X size={18}/></button>
     </header>
     <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-pink-50 px-4 py-2 text-[11px]">
       <p className="flex items-center gap-1.5 font-medium text-pink-900"><ShieldCheck size={14}/> Answers from our site & FAQ</p>
       <span className={cn('shrink-0 font-semibold tabular-nums',blocked?'text-red-700':'text-slate-700')}>{remaining}/10 left</span>
     </div>
     <div ref={messagesPane} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4">
       {!entries.length&&<div className="space-y-4">
         <div className="rounded-2xl bg-pink-50 p-4 text-[13px] leading-6 text-slate-700">
           আসসালামু আলাইকুম! Signup, Biodata, Premium, Connection বা অফিসে যোগাযোগ সম্পর্কে প্রশ্ন করতে পারেন। অন্য বিষয়ে উত্তর দিতে পারব না।
         </div>
         <div className="space-y-2"><p className="text-[11px] font-semibold text-gray-500">Frequently asked</p>
           {suggestions.map(s=><button type="button" key={s} disabled={busy||blocked} onClick={()=>void send(s)}
             className="block w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-left text-[12px] leading-5 text-pink-800 transition hover:bg-pink-50 disabled:opacity-50">{s}</button>)}
         </div>
       </div>}
       {entries.map(row=><div key={row.id} className={cn('flex',row.role==='user'?'justify-end':'justify-start')}>
         <div className={cn('max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-6',row.role==='user'?
           'rounded-br-sm bg-pink-600 text-white':'rounded-bl-sm bg-slate-100 text-slate-800')}>
           <p className="whitespace-pre-wrap break-words">{row.text}</p>
           {!!row.sources?.length&&<div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
             {row.sources.map(source=><a key={source.url} href={source.url}
               className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-pink-700 underline">{source.title}</a>)}
           </div>}
         </div>
       </div>)}
       {busy&&<p role="status" className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={15} className="animate-spin"/> উত্তর খুঁজছি…</p>}
     </div>
     <form className="border-t border-slate-100 bg-white p-3" onSubmit={e=>{e.preventDefault();void send(message)}}>
       <p className="mb-2 text-[10px] leading-4 text-slate-500">OTP, password বা ব্যক্তিগত সংবেদনশীল তথ্য এখানে লিখবেন না। AI-এর উত্তর ভুল হতে পারে; গুরুত্বপূর্ণ বিষয়ে টিমকে জিজ্ঞেস করুন।</p>
       <div className="flex items-end gap-2">
         <label className="flex-1"><span className="sr-only">Ask Niqaha support</span>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={2} maxLength={600}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send(message)}}}
            placeholder={blocked?'২৪ ঘণ্টার প্রশ্ন সীমা শেষ':'আপনার প্রশ্ন লিখুন…'}
            disabled={busy||blocked} className="w-full resize-none rounded-xl border border-pink-200 px-3 py-2 text-[12px] focus:outline-2 focus:outline-pink-500 disabled:bg-slate-100"/>
         </label>
         <button type="submit" disabled={!message.trim()||busy||blocked} title="Send question" aria-label="Send question"
           className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white transition hover:bg-pink-700 disabled:opacity-40"><Send size={17}/></button>
       </div>
       <p className="mt-1.5 text-right text-[10px] text-gray-500">{message.length}/600 · 10 questions / rolling 24 hours</p>
     </form>
   </section>}
   <div className={cn('pointer-events-auto flex flex-col items-center gap-2 self-end',styles.controls)}
     data-support-hub-controls="true">
     <button type="button" data-support-ai-avatar="true"
       onClick={()=>{setContactsOpen(false);setOpen(value=>!value);}}
       aria-expanded={open} aria-controls="niqaha-support-dialog"
       aria-label={open?'Close Niqaha AI chat':'Open Niqaha free AI support'}
       title="Free AI Help"
       className={cn('group relative inline-flex size-[68px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-rose-700 shadow-[0_9px_26px_rgba(190,24,93,.34)] ring-[3px] ring-pink-100/85 motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-1 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-600',styles.avatarButton)}> 
       <SupportSmileAvatar/>
       <span aria-hidden="true" className={cn('pointer-events-none absolute right-[calc(100%+11px)] top-[19px] whitespace-nowrap rounded-full border border-pink-100 bg-white px-3 py-1.5 text-[11px] font-bold text-pink-700 shadow-[0_5px_18px_rgba(150,22,76,.15)]',styles.avatarLabel)}> 
         Free AI Help
       </span>
       <span className={styles.onlineDot} aria-hidden="true"/>
       {open&&<span aria-hidden="true" className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white"><X size={13}/></span>}
     </button>
     {showContactActions&&<>
       <div id="niqaha-contact-actions" role="group" aria-label="Contact our support team"
         className={cn('w-full flex-col items-center gap-2',contactsOpen?'flex':'hidden',
           contactsOpen&&styles.menu)}> 
         {messengerUrl&&<a data-support-messenger="true" href={messengerUrl}
           target="_blank" rel="noopener noreferrer" aria-label="Contact Niqaha via Facebook Messenger"
           title="Messenger-এ যোগাযোগ করুন" onClick={()=>setContactsOpen(false)}
           className={cn('group relative inline-flex size-12 items-center justify-center rounded-full border-2 border-white bg-[#ed008c] text-white shadow-[0_6px_20px_rgba(190,24,93,.27)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600',styles.menuItem)}> 
           <FaFacebookMessenger size={23} aria-hidden="true"/>
           <span className="pointer-events-none absolute right-[calc(100%+10px)] hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg group-hover:block">Messenger</span>
         </a>}
         <a data-support-call="true" href={`tel:${contacts.general}`}
           aria-label="Call Niqaha support" title="সরাসরি ফোন করুন" onClick={()=>setContactsOpen(false)}
           className={cn('group relative inline-flex size-12 items-center justify-center rounded-full border-2 border-white bg-pink-600 text-white shadow-[0_6px_20px_rgba(190,24,93,.27)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600',styles.menuItem)}> 
           <Phone size={21} aria-hidden="true"/>
           <span className="pointer-events-none absolute right-[calc(100%+10px)] hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg group-hover:block">Call</span>
         </a>
       </div>
       <button type="button" data-support-more="true" aria-controls="niqaha-contact-actions"
         aria-expanded={contactsOpen} aria-label={contactsOpen?'Hide Messenger and phone':'Show Messenger and phone'}
         title={contactsOpen?'Hide contact options':'More contact options'}
         onClick={()=>{setOpen(false);setContactsOpen(value=>!value);}}
         className="inline-flex size-12 items-center justify-center rounded-full border border-pink-200 bg-white text-pink-700 shadow-[0_6px_20px_rgba(81,16,48,.12)] transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
         {contactsOpen?<X size={21} aria-hidden="true"/>:<Ellipsis size={27} strokeWidth={2.6} aria-hidden="true"/>}
       </button>
     </>}
   </div>
 </div>;
}
