'use client';
import {useState} from 'react';
import {Check,Link2,Share2} from 'lucide-react';
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
    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
    {copied?<Check size={16}/>:<Share2 size={16}/>}
    {copied?'লিংক কপি হয়েছে':'শেয়ার করুন'}
  </button>;
}
