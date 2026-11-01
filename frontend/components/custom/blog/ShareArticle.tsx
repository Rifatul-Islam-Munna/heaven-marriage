'use client';
import {useState} from 'react';
import {Check,Share2} from 'lucide-react';
export default function ShareArticle({title}:{title:string}){
  const [copied,setCopied]=useState(false);
  async function share(){
    const url=window.location.href;
    try{
      if(navigator.share)await navigator.share({title,url});
      else {await navigator.clipboard.writeText(url);setCopied(true);}
    }catch{/* User may cancel native share; no error is necessary. */}
  }
  return <button type="button" onClick={()=>void share()}
    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
    {copied?<Check size={16}/>:<Share2 size={16}/>}
    {copied?'লিংক কপি হয়েছে':'শেয়ার করুন'}
  </button>;
}
